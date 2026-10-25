use crate::background_eval::{
  run_snapshot, Price, Rule, RuleStateCache, Snapshot, Trade,
};
use crate::background_files::{clear_events_file, read_events_file, write_atomic};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};

static TEMP_COUNTER: AtomicU64 = AtomicU64::new(0);

fn temp_dir() -> PathBuf {
  std::env::temp_dir().join(format!(
    "clytrade-background-tests-{}-{}",
    std::process::id(),
    TEMP_COUNTER.fetch_add(1, Ordering::Relaxed)
  ))
}

#[test]
fn parses_the_task_eighteen_snapshot_contract() {
  let raw = r#"{
    "version": 1,
    "generatedAt": 1700000000000,
    "locale": "fa",
    "provider": "auto",
    "coingeckoKey": "demo-key",
    "backgroundMonitoring": true,
    "windowsCloseBehavior": "tray",
    "staleMs": 900000,
    "notification": { "title": "ClyTrade alerts", "body": "Background hit" },
    "trades": [{
      "id": "t1",
      "symbol": "BTC",
      "direction": "short",
      "targetPrice": 100.0,
      "stopPrice": 110.0,
      "autoClose": true,
      "binanceSymbol": "BTCUSDT",
      "coingeckoId": null,
      "updatedAt": 11,
      "priceKey": "binance:BTCUSDT"
    }],
    "rules": [{
      "id": "r1",
      "symbol": "BTC",
      "kind": "price",
      "priceMode": "above",
      "level": 100.0,
      "rangeLow": null,
      "rangeHigh": null,
      "percent": null,
      "percentDirection": null,
      "repeat": "cooldown",
      "cooldownMinutes": 60,
      "referencePrice": null,
      "lastPrice": 99.0,
      "armed": true,
      "lastFiredAt": null,
      "binanceSymbol": "BTCUSDT",
      "coingeckoId": null,
      "updatedAt": 12,
      "priceKey": "binance:BTCUSDT"
    }]
  }"#;

  let snapshot: Snapshot = serde_json::from_str(raw).expect("snapshot parses");
  assert_eq!(snapshot.version, 1);
  assert_eq!(snapshot.generated_at, 1_700_000_000_000);
  assert_eq!(snapshot.locale, "fa");
  assert_eq!(snapshot.provider, "auto");
  assert_eq!(snapshot.coingecko_key.as_deref(), Some("demo-key"));
  assert!(snapshot.background_monitoring);
  assert_eq!(snapshot.windows_close_behavior, "tray");
  assert_eq!(snapshot.stale_ms, 900_000);
  assert_eq!(snapshot.notification.title, "ClyTrade alerts");
  assert_eq!(snapshot.notification.body, "Background hit");

  assert_eq!(snapshot.trades.len(), 1);
  let trade = &snapshot.trades[0];
  assert_eq!(trade.direction, "short");
  assert_eq!(trade.target_price, Some(100.0));
  assert_eq!(trade.stop_price, Some(110.0));
  assert!(trade.auto_close);
  assert_eq!(trade.price_key, "binance:BTCUSDT");
  assert_eq!(trade.status, "open");

  assert_eq!(snapshot.rules.len(), 1);
  let rule = &snapshot.rules[0];
  assert_eq!(rule.price_mode.as_deref(), Some("above"));
  assert_eq!(rule.cooldown_minutes, 60);
  assert_eq!(rule.last_price, Some(99.0));
  assert!(rule.armed);
  assert!(rule.enabled);
  assert_eq!(rule.updated_at, 12);
  assert_eq!(rule.price_key, "binance:BTCUSDT");
}

#[test]
fn parses_a_minimal_snapshot_with_safe_defaults() {
  let snapshot: Snapshot = serde_json::from_str("{}").expect("empty object parses");
  assert_eq!(snapshot.version, 1);
  assert_eq!(snapshot.locale, "en");
  assert_eq!(snapshot.provider, "auto");
  assert_eq!(snapshot.windows_close_behavior, "unset");
  assert_eq!(snapshot.stale_ms, 900_000);
  assert!(!snapshot.background_monitoring);
  assert!(snapshot.trades.is_empty());
  assert!(snapshot.rules.is_empty());
}

#[test]
fn missing_event_queue_reads_as_an_empty_array() {
  let directory = temp_dir();
  let path = directory.join("background-events.json");
  assert_eq!(read_events_file(&path), "[]");
}

#[test]
fn corrupt_event_queue_reads_as_an_empty_array() {
  let directory = temp_dir();
  std::fs::create_dir_all(&directory).unwrap();
  let path = directory.join("background-events.json");
  std::fs::write(&path, "{not an array").unwrap();
  assert_eq!(read_events_file(&path), "[]");

  std::fs::write(&path, r#"{"events":[]}"#).unwrap();
  assert_eq!(read_events_file(&path), "[]");
  let _ = std::fs::remove_dir_all(directory);
}

#[test]
fn event_queue_round_trips_as_the_original_array() {
  let directory = temp_dir();
  std::fs::create_dir_all(&directory).unwrap();
  let path = directory.join("background-events.json");
  let raw = r#"[{"id":"e1","kind":"level","tradeId":null,"ruleId":"r1","symbol":"BTC","price":101.5,"level":100.0,"targetPrice":null,"stopPrice":null,"direction":"long","at":1700000000000,"provider":"binance"}]"#;
  std::fs::write(&path, raw).unwrap();
  assert_eq!(read_events_file(&path), raw);
  let _ = std::fs::remove_dir_all(directory);
}

#[test]
fn clearing_the_event_queue_removes_the_file_and_tolerates_a_missing_one() {
  let directory = temp_dir();
  std::fs::create_dir_all(&directory).unwrap();
  let path = directory.join("background-events.json");
  std::fs::write(&path, "[]").unwrap();
  clear_events_file(&path).expect("queue clears");
  assert!(!path.exists());
  clear_events_file(&path).expect("missing queue is fine");
  let _ = std::fs::remove_dir_all(directory);
}

#[test]
fn atomic_write_creates_the_directory_and_replaces_the_file() {
  let directory = temp_dir();
  let path = directory.join("nested").join("background-snapshot.json");
  write_atomic(&path, br#"{"version":1}"#).expect("first write");
  assert_eq!(std::fs::read_to_string(&path).unwrap(), r#"{"version":1}"#);
  write_atomic(&path, br#"{"version":2}"#).expect("second write");
  assert_eq!(std::fs::read_to_string(&path).unwrap(), r#"{"version":2}"#);

  let entries: Vec<String> = std::fs::read_dir(path.parent().unwrap())
    .unwrap()
    .map(|entry| entry.unwrap().file_name().to_string_lossy().into_owned())
    .collect();
  assert_eq!(entries, vec!["background-snapshot.json".to_string()]);
  let _ = std::fs::remove_dir_all(directory);
}

#[test]
fn queued_events_carry_the_task_eighteen_event_contract() {
  let snapshot = Snapshot {
    stale_ms: 900_000,
    trades: vec![Trade {
      id: "t1".to_string(),
      symbol: "BTC".to_string(),
      direction: "short".to_string(),
      status: "open".to_string(),
      target_price: Some(100.0),
      stop_price: Some(110.0),
      auto_close: true,
      binance_symbol: Some("BTCUSDT".to_string()),
      updated_at: 1,
      price_key: "binance:BTCUSDT".to_string(),
      ..Trade::default()
    }],
    rules: vec![Rule {
      id: "r1".to_string(),
      symbol: "ETH".to_string(),
      kind: "price".to_string(),
      price_mode: Some("above".to_string()),
      level: Some(50.0),
      repeat: "once".to_string(),
      cooldown_minutes: 60,
      armed: true,
      enabled: true,
      binance_symbol: Some("ETHUSDT".to_string()),
      updated_at: 1,
      price_key: "binance:ETHUSDT".to_string(),
      ..Rule::default()
    }],
    ..Snapshot::default()
  };
  let mut prices = HashMap::new();
  prices.insert(
    "binance:BTCUSDT".to_string(),
    Price {
      key: "binance:BTCUSDT".to_string(),
      provider: "binance".to_string(),
      price: 95.0,
      fetched_at: 1_000,
      ..Price::default()
    },
  );
  prices.insert(
    "binance:ETHUSDT".to_string(),
    Price {
      key: "binance:ETHUSDT".to_string(),
      provider: "binance".to_string(),
      price: 55.0,
      fetched_at: 1_000,
      ..Price::default()
    },
  );

  let mut cache = RuleStateCache::default();
  let run = run_snapshot(&snapshot, &prices, "[]", 2_000, &mut cache);
  assert_eq!(run.queued.len(), 2);

  let trade_event = run.queued.iter().find(|event| event.kind == "target").unwrap();
  assert_eq!(trade_event.direction, "short");
  assert_eq!(trade_event.trade_id.as_deref(), Some("t1"));
  assert_eq!(trade_event.target_price, Some(100.0));
  assert_eq!(trade_event.stop_price, Some(110.0));
  assert_eq!(trade_event.level, Some(100.0));
  assert!(trade_event.id.starts_with("bg:"));

  let rule_event = run.queued.iter().find(|event| event.kind == "level").unwrap();
  assert_eq!(rule_event.direction, "long");
  assert_eq!(rule_event.rule_id.as_deref(), Some("r1"));
  assert_eq!(rule_event.target_price, None);
  assert_eq!(rule_event.stop_price, None);
  assert!(rule_event.id.starts_with("bg:"));

  let stored: serde_json::Value = serde_json::from_str(&run.queue_json).unwrap();
  let first = &stored[0];
  assert!(first.get("id").and_then(|value| value.as_str()).is_some());
  assert!(first.get("direction").and_then(|value| value.as_str()).is_some());
  let mut keys: Vec<&str> = first
    .as_object()
    .unwrap()
    .keys()
    .map(String::as_str)
    .collect();
  keys.sort_unstable();
  assert_eq!(
    keys,
    vec![
      "at",
      "direction",
      "id",
      "kind",
      "level",
      "price",
      "provider",
      "ruleId",
      "stopPrice",
      "symbol",
      "targetPrice",
      "tradeId"
    ]
  );
}
