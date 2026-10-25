use crate::background_eval::{
  market_refs, parse_binance_prices, parse_coingecko_prices, provider_candidates, run_snapshot,
  uncovered_refs, MarketRef, NotificationPayload, Price, RuleStateCache, Snapshot,
};
use crate::background_files::{clear_events_file, read_events_file, write_atomic};
use std::collections::{HashMap, HashSet};
use std::path::PathBuf;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager};
use tauri_plugin_notification::{NotificationExt, PermissionState};

pub const SNAPSHOT_FILE: &str = "background-snapshot.json";
pub const EVENTS_FILE: &str = "background-events.json";

const POLL_INTERVAL: Duration = Duration::from_secs(5 * 60);
const HTTP_TIMEOUT: Duration = Duration::from_secs(15);
const BINANCE_URL: &str = "https://api.binance.com/api/v3/ticker/price";
const COINGECKO_URL: &str = "https://api.coingecko.com/api/v3/simple/price";

fn now_ms() -> i64 {
  SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .map(|duration| duration.as_millis() as i64)
    .unwrap_or(0)
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct PollSummary {
  pub ran: bool,
  pub prices: usize,
  pub hits: usize,
  pub queued: usize,
}

fn app_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
  app.path().app_data_dir().map_err(|error| error.to_string())
}

fn snapshot_path(app: &AppHandle) -> Result<PathBuf, String> {
  Ok(app_data_dir(app)?.join(SNAPSHOT_FILE))
}

fn events_path(app: &AppHandle) -> Result<PathBuf, String> {
  Ok(app_data_dir(app)?.join(EVENTS_FILE))
}

#[tauri::command]
pub fn write_background_snapshot(app: AppHandle, json: String) -> Result<(), String> {
  let value = serde_json::from_str::<serde_json::Value>(&json)
    .map_err(|error| format!("invalid background snapshot: {error}"))?;
  if !value.is_object() {
    return Err("invalid background snapshot: expected an object".to_string());
  }
  write_atomic(&snapshot_path(&app)?, json.as_bytes())
}

#[tauri::command]
pub fn read_background_events(app: AppHandle) -> Result<String, String> {
  Ok(read_events_file(&events_path(&app)?))
}

#[tauri::command]
pub fn clear_background_events(app: AppHandle) -> Result<(), String> {
  clear_events_file(&events_path(&app)?)
}

async fn fetch_binance(
  client: &reqwest::Client,
  refs: &[MarketRef],
) -> Result<Vec<Price>, String> {
  let symbols: Vec<&str> = refs
    .iter()
    .filter_map(|reference| {
      reference
        .binance_symbol
        .as_deref()
        .filter(|value| !value.is_empty())
    })
    .collect();
  if symbols.is_empty() {
    return Ok(Vec::new());
  }
  let symbols = serde_json::to_string(&symbols).map_err(|error| error.to_string())?;
  let response = client
    .get(BINANCE_URL)
    .query(&[("symbols", symbols.as_str())])
    .send()
    .await
    .map_err(|error| error.to_string())?;
  if !response.status().is_success() {
    return Err(format!("binance returned {}", response.status()));
  }
  let payload = response.text().await.map_err(|error| error.to_string())?;
  Ok(parse_binance_prices(&payload, refs, now_ms()))
}

async fn fetch_coingecko(
  client: &reqwest::Client,
  api_key: Option<&str>,
  refs: &[MarketRef],
) -> Result<Vec<Price>, String> {
  let ids: Vec<&str> = refs
    .iter()
    .filter_map(|reference| {
      reference
        .coingecko_id
        .as_deref()
        .filter(|value| !value.is_empty())
    })
    .collect();
  if ids.is_empty() {
    return Ok(Vec::new());
  }
  let ids = ids.join(",");
  let mut request = client.get(COINGECKO_URL).query(&[
    ("ids", ids.as_str()),
    ("vs_currencies", "usd"),
  ]);
  if let Some(api_key) = api_key.map(str::trim).filter(|value| !value.is_empty()) {
    request = request.header("x-cg-demo-api-key", api_key);
  }
  let response = request.send().await.map_err(|error| error.to_string())?;
  if !response.status().is_success() {
    return Err(format!("coingecko returned {}", response.status()));
  }
  let payload = response.text().await.map_err(|error| error.to_string())?;
  Ok(parse_coingecko_prices(&payload, refs, now_ms()))
}

async fn fetch_prices(
  client: &reqwest::Client,
  snapshot: &Snapshot,
  refs: &[MarketRef],
) -> HashMap<String, Price> {
  let choice = snapshot.provider.as_str();
  let mut prices = HashMap::new();
  let mut covered = HashSet::new();

  if choice != "coingecko" {
    let candidates = provider_candidates(refs, "binance");
    if !candidates.is_empty() {
      match fetch_binance(client, &candidates).await {
        Ok(fetched) => {
          for price in fetched {
            covered.insert(price.key.clone());
            prices.insert(price.key.clone(), price);
          }
        }
        Err(error) => eprintln!("binance background fetch failed: {error}"),
      }
    }
  }

  if choice != "binance" {
    let candidates = if choice == "auto" {
      uncovered_refs(refs, &covered)
    } else {
      refs.to_vec()
    };
    let candidates = provider_candidates(&candidates, "coingecko");
    if !candidates.is_empty() {
      match fetch_coingecko(client, snapshot.coingecko_key.as_deref(), &candidates).await {
        Ok(fetched) => {
          for price in fetched {
            prices.insert(price.key.clone(), price);
          }
        }
        Err(error) => eprintln!("coingecko background fetch failed: {error}"),
      }
    }
  }

  prices
}

fn notify(app: &AppHandle, payload: &NotificationPayload) {
  let granted = app
    .notification()
    .permission_state()
    .map(|state| state == PermissionState::Granted)
    .unwrap_or(false);
  if !granted {
    return;
  }
  if let Err(error) = app
    .notification()
    .builder()
    .title(payload.title.clone())
    .body(payload.body.clone())
    .show()
  {
    eprintln!("background notification failed: {error}");
  }
}

pub async fn poll_once(
  app: &AppHandle,
  client: &reqwest::Client,
  cache: &mut RuleStateCache,
) -> Result<PollSummary, String> {
  let path = snapshot_path(app)?;
  let raw = match std::fs::read_to_string(&path) {
    Ok(raw) => raw,
    Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
      cache.clear();
      return Ok(PollSummary::default());
    }
    Err(error) => return Err(error.to_string()),
  };
  let snapshot: Snapshot = match serde_json::from_str(&raw) {
    Ok(snapshot) => snapshot,
    Err(error) => {
      cache.clear();
      return Err(format!("invalid background snapshot: {error}"));
    }
  };
  if !snapshot.background_monitoring {
    cache.clear();
    return Ok(PollSummary::default());
  }

  let refs = market_refs(&snapshot);
  if refs.is_empty() {
    return Ok(PollSummary {
      ran: true,
      ..PollSummary::default()
    });
  }

  let prices = fetch_prices(client, &snapshot, &refs).await;
  let existing = read_events_file(&events_path(app)?);
  let mut next_cache = cache.clone();
  let run = run_snapshot(&snapshot, &prices, &existing, now_ms(), &mut next_cache);

  if !run.queued.is_empty() {
    write_atomic(&events_path(app)?, run.queue_json.as_bytes())?;
    if let Some(payload) = &run.notification {
      notify(app, payload);
    }
  }
  *cache = next_cache;

  Ok(PollSummary {
    ran: true,
    prices: run.prices,
    hits: run.events.len() + run.reviews.len(),
    queued: run.queued.len(),
  })
}

pub fn spawn_timer(app: AppHandle) {
  tauri::async_runtime::spawn(async move {
    let client = match reqwest::Client::builder().timeout(HTTP_TIMEOUT).build() {
      Ok(client) => client,
      Err(error) => {
        eprintln!("background http client failed: {error}");
        return;
      }
    };
    let mut cache = RuleStateCache::default();
    tokio::time::sleep(Duration::from_secs(5)).await;
    loop {
      match poll_once(&app, &client, &mut cache).await {
        Ok(_) => {}
        Err(error) => eprintln!("background poll failed: {error}"),
      }
      tokio::time::sleep(POLL_INTERVAL).await;
    }
  });
}

#[cfg(test)]
#[path = "background_tests.rs"]
mod tests;
