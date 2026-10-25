use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};

pub const DEFAULT_STALE_MS: i64 = 15 * 60_000;
pub const TRADE_DEDUPE_MS: i64 = 5 * 60_000;
pub const QUEUE_CAP: usize = 200;
pub const MAX_NOTIFICATION_ITEMS: usize = 5;

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct NotificationTemplate {
  #[serde(default)]
  pub title: String,
  #[serde(default)]
  pub body: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
  #[serde(default = "default_version")]
  pub version: u32,
  #[serde(default)]
  pub generated_at: i64,
  #[serde(default = "default_locale")]
  pub locale: String,
  #[serde(default = "default_provider")]
  pub provider: String,
  #[serde(default)]
  pub coingecko_key: Option<String>,
  #[serde(default)]
  pub background_monitoring: bool,
  #[serde(default = "default_close_behavior")]
  pub windows_close_behavior: String,
  #[serde(default = "default_stale_ms")]
  pub stale_ms: i64,
  #[serde(default)]
  pub notification: NotificationTemplate,
  #[serde(default)]
  pub trades: Vec<Trade>,
  #[serde(default)]
  pub rules: Vec<Rule>,
}

fn default_version() -> u32 {
  1
}

fn default_locale() -> String {
  "en".to_string()
}

fn default_provider() -> String {
  "auto".to_string()
}

fn default_close_behavior() -> String {
  "unset".to_string()
}

fn default_stale_ms() -> i64 {
  DEFAULT_STALE_MS
}

fn default_status() -> String {
  "open".to_string()
}

fn default_kind() -> String {
  "price".to_string()
}

fn default_repeat() -> String {
  "once".to_string()
}

fn default_cooldown_minutes() -> i64 {
  60
}

fn default_true() -> bool {
  true
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Trade {
  #[serde(default)]
  pub id: String,
  #[serde(default)]
  pub symbol: String,
  #[serde(default = "default_direction")]
  pub direction: String,
  #[serde(default = "default_status")]
  pub status: String,
  #[serde(default)]
  pub target_price: Option<f64>,
  #[serde(default)]
  pub stop_price: Option<f64>,
  #[serde(default)]
  pub auto_close: bool,
  #[serde(default)]
  pub binance_symbol: Option<String>,
  #[serde(default)]
  pub coingecko_id: Option<String>,
  #[serde(default)]
  pub updated_at: i64,
  #[serde(default)]
  pub price_key: String,
}

fn default_direction() -> String {
  "long".to_string()
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Rule {
  #[serde(default)]
  pub id: String,
  #[serde(default)]
  pub symbol: String,
  #[serde(default = "default_kind")]
  pub kind: String,
  #[serde(default)]
  pub price_mode: Option<String>,
  #[serde(default)]
  pub level: Option<f64>,
  #[serde(default)]
  pub range_low: Option<f64>,
  #[serde(default)]
  pub range_high: Option<f64>,
  #[serde(default)]
  pub percent: Option<f64>,
  #[serde(default)]
  pub percent_direction: Option<String>,
  #[serde(default = "default_repeat")]
  pub repeat: String,
  #[serde(default = "default_cooldown_minutes")]
  pub cooldown_minutes: i64,
  #[serde(default)]
  pub reference_price: Option<f64>,
  #[serde(default)]
  pub last_price: Option<f64>,
  #[serde(default)]
  pub armed: bool,
  #[serde(default = "default_true")]
  pub enabled: bool,
  #[serde(default)]
  pub last_fired_at: Option<i64>,
  #[serde(default)]
  pub binance_symbol: Option<String>,
  #[serde(default)]
  pub coingecko_id: Option<String>,
  #[serde(default)]
  pub updated_at: i64,
  #[serde(default)]
  pub price_key: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Price {
  #[serde(default)]
  pub key: String,
  #[serde(default)]
  pub symbol: String,
  #[serde(default)]
  pub provider: String,
  #[serde(default)]
  pub price: f64,
  #[serde(default)]
  pub fetched_at: i64,
  #[serde(default)]
  pub source_timestamp: Option<i64>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Event {
  #[serde(default)]
  pub kind: String,
  #[serde(default)]
  pub trade_id: Option<String>,
  #[serde(default)]
  pub rule_id: Option<String>,
  #[serde(default)]
  pub symbol: String,
  #[serde(default)]
  pub price: f64,
  #[serde(default)]
  pub level: Option<f64>,
  #[serde(default)]
  pub target_price: Option<f64>,
  #[serde(default)]
  pub stop_price: Option<f64>,
  #[serde(default)]
  pub at: i64,
  #[serde(default)]
  pub provider: String,
  #[serde(default = "default_event_status")]
  pub status: String,
  #[serde(default)]
  pub resolution: Option<String>,
  #[serde(default)]
  pub read_at: Option<i64>,
}

fn default_event_status() -> String {
  "unread".to_string()
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct QueueEvent {
  #[serde(default)]
  pub id: String,
  #[serde(default)]
  pub kind: String,
  #[serde(default)]
  pub trade_id: Option<String>,
  #[serde(default)]
  pub rule_id: Option<String>,
  #[serde(default)]
  pub symbol: String,
  #[serde(default)]
  pub price: f64,
  #[serde(default)]
  pub level: Option<f64>,
  #[serde(default)]
  pub target_price: Option<f64>,
  #[serde(default)]
  pub stop_price: Option<f64>,
  #[serde(default)]
  pub at: i64,
  #[serde(default)]
  pub provider: String,
  #[serde(default = "default_direction")]
  pub direction: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Close {
  #[serde(default)]
  pub trade_id: String,
  #[serde(default)]
  pub level: f64,
  #[serde(default)]
  pub reason: String,
  #[serde(default)]
  pub at: i64,
  #[serde(default)]
  pub price: f64,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct RulePatch {
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub armed: Option<bool>,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub last_price: Option<f64>,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub last_fired_at: Option<i64>,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub enabled: Option<bool>,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub reference_price: Option<f64>,
}

impl RulePatch {
  fn is_empty(&self) -> bool {
    self.armed.is_none()
      && self.last_price.is_none()
      && self.last_fired_at.is_none()
      && self.enabled.is_none()
      && self.reference_price.is_none()
  }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct RuleUpdate {
  #[serde(default)]
  pub id: String,
  #[serde(default)]
  pub patch: RulePatch,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct EvaluationResult {
  #[serde(default)]
  pub events: Vec<Event>,
  #[serde(default)]
  pub closes: Vec<Close>,
  #[serde(default)]
  pub reviews: Vec<Event>,
  #[serde(default)]
  pub rule_updates: Vec<RuleUpdate>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct MarketRef {
  pub key: String,
  pub symbol: String,
  pub binance_symbol: Option<String>,
  pub coingecko_id: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum RuleMode {
  Above,
  Below,
  Crossing,
  Range,
  Percent,
}

pub struct EvaluationInput<'a> {
  pub now: i64,
  pub prices: &'a HashMap<String, Price>,
  pub trades: &'a [Trade],
  pub rules: &'a [Rule],
  pub stale_ms: i64,
}

pub fn price_key_for(
  binance_symbol: Option<&str>,
  coingecko_id: Option<&str>,
  symbol: &str,
) -> String {
  if let Some(binance) = binance_symbol.filter(|value| !value.is_empty()) {
    return format!("binance:{binance}");
  }
  if let Some(coingecko) = coingecko_id.filter(|value| !value.is_empty()) {
    return format!("coingecko:{coingecko}");
  }
  format!("symbol:{}", symbol.trim().to_uppercase())
}

fn has_mapping(binance_symbol: &Option<String>, coingecko_id: &Option<String>) -> bool {
  binance_symbol
    .as_deref()
    .is_some_and(|value| !value.is_empty())
    || coingecko_id
      .as_deref()
      .is_some_and(|value| !value.is_empty())
}

pub fn market_refs(snapshot: &Snapshot) -> Vec<MarketRef> {
  let mut refs = Vec::new();
  let mut seen = HashSet::new();

  for trade in &snapshot.trades {
    if trade.status != "open" {
      continue;
    }
    if trade.target_price.is_none() && trade.stop_price.is_none() {
      continue;
    }
    let key = price_key_for(
      trade.binance_symbol.as_deref(),
      trade.coingecko_id.as_deref(),
      &trade.symbol,
    );
    if seen.insert(key.clone()) {
      refs.push(MarketRef {
        key,
        symbol: trade.symbol.clone(),
        binance_symbol: trade.binance_symbol.clone(),
        coingecko_id: trade.coingecko_id.clone(),
      });
    }
  }

  for rule in &snapshot.rules {
    if !rule.enabled {
      continue;
    }
    if !has_mapping(&rule.binance_symbol, &rule.coingecko_id) {
      continue;
    }
    let key = price_key_for(
      rule.binance_symbol.as_deref(),
      rule.coingecko_id.as_deref(),
      &rule.symbol,
    );
    if seen.insert(key.clone()) {
      refs.push(MarketRef {
        key,
        symbol: rule.symbol.clone(),
        binance_symbol: rule.binance_symbol.clone(),
        coingecko_id: rule.coingecko_id.clone(),
      });
    }
  }

  refs
}

pub fn provider_candidates(refs: &[MarketRef], provider: &str) -> Vec<MarketRef> {
  refs
    .iter()
    .filter(|reference| match provider {
      "binance" => reference
        .binance_symbol
        .as_deref()
        .is_some_and(|value| !value.is_empty()),
      "coingecko" => reference
        .coingecko_id
        .as_deref()
        .is_some_and(|value| !value.is_empty()),
      _ => false,
    })
    .cloned()
    .collect()
}

pub fn uncovered_refs(
  refs: &[MarketRef],
  covered: &HashSet<String>,
) -> Vec<MarketRef> {
  refs
    .iter()
    .filter(|reference| !covered.contains(&reference.key))
    .cloned()
    .collect()
}

fn make_event(
  kind: &str,
  trade_id: Option<String>,
  rule_id: Option<String>,
  symbol: &str,
  price: f64,
  level: Option<f64>,
  target_price: Option<f64>,
  stop_price: Option<f64>,
  at: i64,
  provider: &str,
) -> Event {
  Event {
    kind: kind.to_string(),
    trade_id,
    rule_id,
    symbol: symbol.to_string(),
    price,
    level,
    target_price,
    stop_price,
    at,
    provider: provider.to_string(),
    status: "unread".to_string(),
    resolution: None,
    read_at: None,
  }
}

fn crossed_target(trade: &Trade, price: f64) -> Option<f64> {
  let target = trade.target_price?;
  let hit = if trade.direction == "long" {
    price >= target
  } else {
    price <= target
  };
  hit.then_some(target)
}

fn crossed_stop(trade: &Trade, price: f64) -> Option<f64> {
  let stop = trade.stop_price?;
  let hit = if trade.direction == "long" {
    price <= stop
  } else {
    price >= stop
  };
  hit.then_some(stop)
}

fn trade_event(
  kind: &str,
  trade: &Trade,
  price: &Price,
  at: i64,
  level: Option<f64>,
) -> Event {
  make_event(
    kind,
    Some(trade.id.clone()),
    None,
    &trade.symbol,
    price.price,
    if kind == "stale" { None } else { level },
    trade.target_price,
    trade.stop_price,
    at,
    &price.provider,
  )
}

fn rule_mode(rule: &Rule) -> Option<RuleMode> {
  if rule.kind == "percent" {
    return Some(RuleMode::Percent);
  }
  if rule.kind != "price" {
    return None;
  }
  match rule.price_mode.as_deref() {
    Some("above") => Some(RuleMode::Above),
    Some("below") => Some(RuleMode::Below),
    Some("crossing") => Some(RuleMode::Crossing),
    Some("range") => Some(RuleMode::Range),
    _ => None,
  }
}

fn is_rule_evaluable(rule: &Rule) -> bool {
  let Some(mode) = rule_mode(rule) else {
    return false;
  };
  if mode == RuleMode::Percent {
    return rule.percent.is_some_and(|percent| percent > 0.0)
      && rule.percent_direction.is_some()
      && rule
        .reference_price
        .is_some_and(|reference| reference != 0.0);
  }
  if mode == RuleMode::Range {
    return rule.range_low.is_some() && rule.range_high.is_some();
  }
  rule.level.is_some()
}

fn percent_active(rule: &Rule, price: f64) -> bool {
  let Some(reference) = rule.reference_price else {
    return false;
  };
  let Some(percent) = rule.percent else {
    return false;
  };
  let Some(direction) = rule.percent_direction.as_deref() else {
    return false;
  };
  if reference == 0.0 {
    return false;
  }

  let change = ((price - reference) / reference) * 100.0;
  if direction == "up" {
    return change >= percent;
  }
  if direction == "down" {
    return change <= -percent;
  }
  change.abs() >= percent
}

fn price_active(rule: &Rule, mode: RuleMode, price: f64) -> bool {
  if mode == RuleMode::Range {
    let (Some(low), Some(high)) = (rule.range_low, rule.range_high) else {
      return false;
    };
    return price < low || price > high;
  }

  let Some(level) = rule.level else {
    return false;
  };
  if mode == RuleMode::Above {
    return price >= level;
  }
  if mode == RuleMode::Below {
    return price <= level;
  }
  false
}

fn is_crossing(rule: &Rule, price: f64) -> bool {
  let Some(level) = rule.level else {
    return false;
  };
  let Some(last) = rule.last_price else {
    return false;
  };
  (last < level && price >= level) || (last > level && price <= level)
}

fn rule_condition_active(rule: &Rule, price: f64) -> bool {
  let Some(mode) = rule_mode(rule) else {
    return false;
  };
  if mode == RuleMode::Percent {
    return percent_active(rule, price);
  }
  if mode == RuleMode::Crossing {
    return is_crossing(rule, price);
  }
  price_active(rule, mode, price)
}

fn decide_rule(rule: &Rule, price: f64) -> (bool, bool) {
  let Some(mode) = rule_mode(rule) else {
    return (false, false);
  };

  if mode == RuleMode::Percent {
    let active = percent_active(rule, price);
    if rule.repeat == "cross-back" && !rule.armed {
      return (false, !active);
    }
    return (active, false);
  }

  if mode == RuleMode::Crossing {
    let crossing = is_crossing(rule, price);
    if rule.repeat == "cross-back" && !rule.armed {
      return (false, crossing);
    }
    return (crossing, false);
  }

  let active = price_active(rule, mode, price);
  if rule.repeat == "cross-back" && !rule.armed {
    return (false, !active);
  }
  (active, false)
}

fn cooldown_elapsed(rule: &Rule, now: i64) -> bool {
  if rule.repeat != "cooldown" {
    return true;
  }
  let Some(last_fired_at) = rule.last_fired_at else {
    return true;
  };
  now - last_fired_at >= rule.cooldown_minutes * 60_000
}

fn rule_event_level(rule: &Rule) -> Option<f64> {
  if rule.kind != "price" {
    return None;
  }
  if rule.price_mode.as_deref() == Some("range") {
    return None;
  }
  rule.level
}

fn rule_event(kind: &str, rule: &Rule, price: &Price, at: i64) -> Event {
  make_event(
    kind,
    None,
    Some(rule.id.clone()),
    &rule.symbol,
    price.price,
    if kind == "stale" {
      None
    } else {
      rule_event_level(rule)
    },
    None,
    None,
    at,
    &price.provider,
  )
}

pub fn evaluate_prices(input: &EvaluationInput) -> EvaluationResult {
  let mut events = Vec::new();
  let mut closes = Vec::new();
  let mut reviews = Vec::new();
  let mut rule_updates = Vec::new();

  for trade in input.trades {
    if trade.status != "open" {
      continue;
    }

    let key = price_key_for(
      trade.binance_symbol.as_deref(),
      trade.coingecko_id.as_deref(),
      &trade.symbol,
    );
    let Some(price) = input.prices.get(&key) else {
      continue;
    };

    let target = crossed_target(trade, price.price);
    let stop = crossed_stop(trade, price.price);
    if target.is_none() && stop.is_none() {
      continue;
    }

    let fresh = input.now - price.fetched_at < input.stale_ms;

    if !fresh {
      reviews.push(trade_event("stale", trade, price, input.now, None));
      continue;
    }

    if target.is_some() && stop.is_some() {
      reviews.push(trade_event("gap", trade, price, input.now, None));
      continue;
    }

    let reason = if target.is_some() { "target" } else { "stop" };
    let level = target.or(stop);
    let Some(level) = level else {
      continue;
    };

    events.push(trade_event(reason, trade, price, input.now, Some(level)));
    if trade.auto_close {
      closes.push(Close {
        trade_id: trade.id.clone(),
        level,
        reason: reason.to_string(),
        at: input.now,
        price: price.price,
      });
    }
  }

  for rule in input.rules {
    if !rule.enabled {
      continue;
    }
    if !has_mapping(&rule.binance_symbol, &rule.coingecko_id) {
      continue;
    }
    if !is_rule_evaluable(rule) {
      continue;
    }

    let key = price_key_for(
      rule.binance_symbol.as_deref(),
      rule.coingecko_id.as_deref(),
      &rule.symbol,
    );
    let Some(price) = input.prices.get(&key) else {
      continue;
    };

    let fresh = input.now - price.fetched_at < input.stale_ms;

    if !fresh {
      if rule_condition_active(rule, price.price) {
        reviews.push(rule_event("stale", rule, price, input.now));
      }
      continue;
    }

    let (fire, rearm) = decide_rule(rule, price.price);
    let fire = fire && cooldown_elapsed(rule, input.now);
    let mut patch = RulePatch::default();
    if rule.last_price != Some(price.price) {
      patch.last_price = Some(price.price);
    }

    if fire {
      patch.last_fired_at = Some(input.now);
      if rule.kind == "percent" {
        patch.reference_price = Some(price.price);
      }
      if rule.repeat == "once" {
        patch.enabled = Some(false);
      }
      if rule.repeat == "cross-back" && rule.armed {
        patch.armed = Some(false);
      }
      events.push(rule_event(
        if rule.kind == "percent" {
          "percent"
        } else {
          "level"
        },
        rule,
        price,
        input.now,
      ));
    } else if rearm && !rule.armed {
      patch.armed = Some(true);
    }

    if !patch.is_empty() {
      rule_updates.push(RuleUpdate {
        id: rule.id.clone(),
        patch,
      });
    }
  }

  EvaluationResult {
    events,
    closes,
    reviews,
    rule_updates,
  }
}

#[derive(Debug, Clone, PartialEq)]
struct CachedRuleState {
  updated_at: i64,
  last_price: Option<f64>,
  armed: bool,
  last_fired_at: Option<i64>,
  reference_price: Option<f64>,
  enabled: bool,
}

impl CachedRuleState {
  fn from_rule(rule: &Rule) -> Self {
    Self {
      updated_at: rule.updated_at,
      last_price: rule.last_price,
      armed: rule.armed,
      last_fired_at: rule.last_fired_at,
      reference_price: rule.reference_price,
      enabled: rule.enabled,
    }
  }
}

#[derive(Debug, Clone, Default)]
pub struct RuleStateCache {
  states: HashMap<String, CachedRuleState>,
}

impl RuleStateCache {
  pub fn clear(&mut self) {
    self.states.clear();
  }
}

fn overlay_rules(snapshot: &Snapshot, cache: &RuleStateCache) -> Vec<Rule> {
  snapshot
    .rules
    .iter()
    .map(|rule| {
      let mut next = rule.clone();
      if let Some(state) = cache.states.get(&rule.id) {
        if state.updated_at == rule.updated_at {
          next.last_price = state.last_price;
          next.armed = state.armed;
          next.last_fired_at = state.last_fired_at;
          next.reference_price = state.reference_price;
          next.enabled = state.enabled;
        }
      }
      next
    })
    .collect()
}

fn apply_rule_updates(cache: &mut RuleStateCache, rules: &[Rule], updates: &[RuleUpdate]) {
  for update in updates {
    let Some(rule) = rules.iter().find(|rule| rule.id == update.id) else {
      continue;
    };
    let mut state = CachedRuleState::from_rule(rule);
    if let Some(armed) = update.patch.armed {
      state.armed = armed;
    }
    if let Some(last_price) = update.patch.last_price {
      state.last_price = Some(last_price);
    }
    if let Some(last_fired_at) = update.patch.last_fired_at {
      state.last_fired_at = Some(last_fired_at);
    }
    if let Some(enabled) = update.patch.enabled {
      state.enabled = enabled;
    }
    if let Some(reference_price) = update.patch.reference_price {
      state.reference_price = Some(reference_price);
    }
    cache.states.insert(rule.id.clone(), state);
  }
}

fn same_event_target(left: &QueueEvent, right: &QueueEvent) -> bool {
  match (left.rule_id.as_deref(), right.rule_id.as_deref()) {
    (Some(left_id), Some(right_id)) if left_id == right_id => return true,
    _ => {}
  }
  match (left.trade_id.as_deref(), right.trade_id.as_deref()) {
    (Some(left_id), Some(right_id)) if left_id == right_id => return true,
    _ => {}
  }
  false
}

fn is_duplicate(
  existing: &[QueueEvent],
  accepted: &[QueueEvent],
  candidate: &QueueEvent,
  cooldowns: &HashMap<&str, i64>,
) -> bool {
  let window = match candidate.rule_id.as_deref() {
    Some(rule_id) => cooldowns
      .get(rule_id)
      .copied()
      .unwrap_or(TRADE_DEDUPE_MS)
      .max(0),
    None => TRADE_DEDUPE_MS,
  };

  existing.iter().chain(accepted.iter()).any(|event| {
    same_event_target(event, candidate)
      && event.level == candidate.level
      && (candidate.at - event.at).abs() < window
  })
}

pub fn append_background_events(
  existing_json: &str,
  candidates: &[QueueEvent],
  rules: &[Rule],
) -> (String, Vec<QueueEvent>) {
  let mut existing: Vec<QueueEvent> = serde_json::from_str(existing_json).unwrap_or_default();
  let cooldowns: HashMap<&str, i64> = rules
    .iter()
    .map(|rule| (rule.id.as_str(), rule.cooldown_minutes * 60_000))
    .collect();
  let mut accepted = Vec::new();

  for candidate in candidates {
    if is_duplicate(&existing, &accepted, candidate, &cooldowns) {
      continue;
    }
    accepted.push(candidate.clone());
  }

  existing.extend(accepted.iter().cloned());
  if existing.len() > QUEUE_CAP {
    let overflow = existing.len() - QUEUE_CAP;
    existing.drain(0..overflow);
  }

  let retained = accepted
    .into_iter()
    .filter(|event| existing.contains(event))
    .collect();
  let json = serde_json::to_string(&existing).unwrap_or_else(|_| "[]".to_string());
  (json, retained)
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct NotificationPayload {
  pub title: String,
  pub body: String,
}

fn format_price(value: f64) -> String {
  format!("{value}")
}

pub fn grouped_notification(
  snapshot: &Snapshot,
  events: &[QueueEvent],
) -> Option<NotificationPayload> {
  if events.is_empty() {
    return None;
  }

  let mut items: Vec<String> = events
    .iter()
    .take(MAX_NOTIFICATION_ITEMS)
    .map(|event| {
      format!(
        "{} · {}",
        event.symbol,
        format_price(event.level.unwrap_or(event.price))
      )
    })
    .collect();

  let remaining = events.len().saturating_sub(MAX_NOTIFICATION_ITEMS);
  if remaining > 0 {
    items.push(format!("+{remaining} more"));
  }

  let items = items.join("\n");
  let body = if snapshot.notification.body.trim().is_empty() {
    items
  } else {
    format!("{}\n{}", snapshot.notification.body, items)
  };

  Some(NotificationPayload {
    title: snapshot.notification.title.clone(),
    body,
  })
}

pub fn parse_binance_prices(payload: &str, refs: &[MarketRef], now: i64) -> Vec<Price> {
  let mut by_symbol: HashMap<&str, &MarketRef> = HashMap::new();
  for reference in refs {
    if let Some(symbol) = reference
      .binance_symbol
      .as_deref()
      .filter(|value| !value.is_empty())
    {
      by_symbol.insert(symbol, reference);
    }
  }
  if by_symbol.is_empty() {
    return Vec::new();
  }

  let Ok(serde_json::Value::Array(rows)) = serde_json::from_str(payload) else {
    return Vec::new();
  };

  let mut prices = Vec::new();
  for row in rows {
    let Some(symbol) = row.get("symbol").and_then(serde_json::Value::as_str) else {
      continue;
    };
    let Some(reference) = by_symbol.get(symbol) else {
      continue;
    };
    let price = row
      .get("price")
      .and_then(|value| {
        value
          .as_f64()
          .or_else(|| value.as_str().and_then(|text| text.parse::<f64>().ok()))
      })
      .filter(|price| price.is_finite() && *price > 0.0);
    let Some(price) = price else {
      continue;
    };
    prices.push(Price {
      key: reference.key.clone(),
      symbol: reference.symbol.clone(),
      provider: "binance".to_string(),
      price,
      fetched_at: now,
      source_timestamp: None,
    });
  }
  prices
}

pub fn parse_coingecko_prices(payload: &str, refs: &[MarketRef], now: i64) -> Vec<Price> {
  let mut order: Vec<&str> = Vec::new();
  let mut by_id: HashMap<&str, &MarketRef> = HashMap::new();
  for reference in refs {
    if let Some(id) = reference
      .coingecko_id
      .as_deref()
      .filter(|value| !value.is_empty())
    {
      if !by_id.contains_key(id) {
        order.push(id);
      }
      by_id.insert(id, reference);
    }
  }
  if by_id.is_empty() {
    return Vec::new();
  }

  let Ok(serde_json::Value::Object(payload)) = serde_json::from_str(payload) else {
    return Vec::new();
  };

  let mut prices = Vec::new();
  for id in order {
    let Some(reference) = by_id.get(id) else {
      continue;
    };
    let Some(row) = payload.get(id).and_then(serde_json::Value::as_object) else {
      continue;
    };
    let Some(price) = row
      .get("usd")
      .and_then(serde_json::Value::as_f64)
      .filter(|price| price.is_finite() && *price > 0.0)
    else {
      continue;
    };
    prices.push(Price {
      key: reference.key.clone(),
      symbol: reference.symbol.clone(),
      provider: "coingecko".to_string(),
      price,
      fetched_at: now,
      source_timestamp: None,
    });
  }
  prices
}

fn event_id(event: &Event) -> String {
  let target = if let Some(rule_id) = event.rule_id.as_deref() {
    format!("rule:{rule_id}")
  } else if let Some(trade_id) = event.trade_id.as_deref() {
    format!("trade:{trade_id}")
  } else {
    event.symbol.clone()
  };
  let level = event
    .level
    .map(format_price)
    .unwrap_or_else(|| "none".to_string());
  format!("bg:{}:{}:{}:{}", event.at, event.kind, target, level)
}

fn event_direction(event: &Event, trades: &[Trade]) -> String {
  if let Some(trade_id) = event.trade_id.as_deref() {
    if let Some(trade) = trades.iter().find(|trade| trade.id == trade_id) {
      return trade.direction.clone();
    }
  }
  "long".to_string()
}

fn queue_event(event: &Event, trades: &[Trade]) -> QueueEvent {
  QueueEvent {
    id: event_id(event),
    kind: event.kind.clone(),
    trade_id: event.trade_id.clone(),
    rule_id: event.rule_id.clone(),
    symbol: event.symbol.clone(),
    price: event.price,
    level: event.level,
    target_price: event.target_price,
    stop_price: event.stop_price,
    at: event.at,
    provider: event.provider.clone(),
    direction: event_direction(event, trades),
  }
}

#[derive(Debug, Clone, PartialEq)]
pub struct SnapshotRun {
  pub prices: usize,
  pub events: Vec<Event>,
  pub reviews: Vec<Event>,
  pub queued: Vec<QueueEvent>,
  pub queue_json: String,
  pub notification: Option<NotificationPayload>,
  pub rule_updates: Vec<RuleUpdate>,
}

pub fn run_snapshot(
  snapshot: &Snapshot,
  prices: &HashMap<String, Price>,
  existing_queue: &str,
  now: i64,
  cache: &mut RuleStateCache,
) -> SnapshotRun {
  let rules = overlay_rules(snapshot, cache);
  let result = evaluate_prices(&EvaluationInput {
    now,
    prices,
    trades: &snapshot.trades,
    rules: &rules,
    stale_ms: snapshot.stale_ms,
  });
  apply_rule_updates(cache, &rules, &result.rule_updates);

  let candidates: Vec<QueueEvent> = result
    .events
    .iter()
    .chain(result.reviews.iter())
    .map(|event| queue_event(event, &snapshot.trades))
    .collect();
  let (queue_json, queued) = append_background_events(existing_queue, &candidates, &rules);
  let notification = grouped_notification(snapshot, &queued);

  SnapshotRun {
    prices: prices.len(),
    events: result.events,
    reviews: result.reviews,
    queued,
    queue_json,
    notification,
    rule_updates: result.rule_updates,
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[derive(Debug, Deserialize)]
  #[serde(rename_all = "camelCase")]
  struct FixtureCase {
    name: String,
    now: i64,
    stale_ms: i64,
    prices: Vec<Price>,
    trades: Vec<Trade>,
    rules: Vec<Rule>,
    expected: EvaluationResult,
  }

  #[derive(Debug, Deserialize)]
  struct FixtureFile {
    version: u32,
    cases: Vec<FixtureCase>,
  }

  fn fixture() -> FixtureFile {
    serde_json::from_str(include_str!("../../src/market/fixtures/evaluation-cases.json"))
      .expect("fixture parses")
  }

  #[test]
  fn shared_fixture_has_the_expected_shape() {
    let fixture = fixture();
    assert_eq!(fixture.version, 1);
    assert_eq!(fixture.cases.len(), 79);
  }

  #[test]
  fn shared_fixture_cases_match() {
    let fixture = fixture();
    for case in fixture.cases {
      let mut prices = HashMap::new();
      for price in case.prices {
        prices.insert(price.key.clone(), price);
      }
      let result = evaluate_prices(&EvaluationInput {
        now: case.now,
        prices: &prices,
        trades: &case.trades,
        rules: &case.rules,
        stale_ms: case.stale_ms,
      });
      let actual = serde_json::to_value(&result).expect("result serializes");
      let expected = serde_json::to_value(&case.expected).expect("expected serializes");
      assert_eq!(actual, expected, "fixture case failed: {}", case.name);
    }
  }

  #[test]
  fn price_key_prefers_binance_then_coingecko_then_symbol() {
    assert_eq!(
      price_key_for(Some("BTCUSDT"), Some("bitcoin"), "BTC"),
      "binance:BTCUSDT"
    );
    assert_eq!(
      price_key_for(None, Some("bitcoin"), "BTC"),
      "coingecko:bitcoin"
    );
    assert_eq!(price_key_for(None, None, " btc "), "symbol:BTC");
  }

  #[test]
  fn market_refs_dedupe_by_key_and_skip_closed_or_unmapped_entries() {
    let snapshot = Snapshot {
      trades: vec![
        Trade {
          id: "t1".to_string(),
          symbol: "BTC".to_string(),
          status: "open".to_string(),
          target_price: Some(100.0),
          binance_symbol: Some("BTCUSDT".to_string()),
          ..Trade::default()
        },
        Trade {
          id: "t2".to_string(),
          symbol: "BTC".to_string(),
          status: "open".to_string(),
          target_price: Some(100.0),
          binance_symbol: Some("BTCUSDT".to_string()),
          ..Trade::default()
        },
        Trade {
          id: "t3".to_string(),
          symbol: "ETH".to_string(),
          status: "closed".to_string(),
          target_price: Some(100.0),
          binance_symbol: Some("ETHUSDT".to_string()),
          ..Trade::default()
        },
      ],
      rules: vec![
        Rule {
          id: "r1".to_string(),
          symbol: "SOL".to_string(),
          enabled: true,
          coingecko_id: Some("solana".to_string()),
          ..Rule::default()
        },
        Rule {
          id: "r2".to_string(),
          symbol: "NONE".to_string(),
          enabled: true,
          ..Rule::default()
        },
      ],
      ..Snapshot::default()
    };
    let refs = market_refs(&snapshot);
    assert_eq!(refs.len(), 2);
    assert_eq!(refs[0].key, "binance:BTCUSDT");
    assert_eq!(refs[1].key, "coingecko:solana");

    let binance = provider_candidates(&refs, "binance");
    assert_eq!(binance.len(), 1);
    assert_eq!(binance[0].key, "binance:BTCUSDT");
    let coingecko = provider_candidates(&refs, "coingecko");
    assert_eq!(coingecko.len(), 1);
    assert_eq!(coingecko[0].key, "coingecko:solana");

    let covered = HashSet::from(["binance:BTCUSDT".to_string()]);
    let uncovered = uncovered_refs(&refs, &covered);
    assert_eq!(uncovered.len(), 1);
    assert_eq!(uncovered[0].key, "coingecko:solana");
  }

  #[test]
  fn queue_dedupes_a_rule_inside_its_cooldown() {
    let rules = vec![Rule {
      id: "r1".to_string(),
      cooldown_minutes: 60,
      ..Rule::default()
    }];
    let first = QueueEvent {
      kind: "level".to_string(),
      rule_id: Some("r1".to_string()),
      level: Some(100.0),
      at: 1_000,
      ..QueueEvent::default()
    };
    let second = QueueEvent {
      at: 1_000 + 30 * 60_000,
      ..first.clone()
    };
    let third = QueueEvent {
      at: 1_000 + 61 * 60_000,
      ..first.clone()
    };

    let (_, queued) = append_background_events("[]", &[first], &rules);
    assert_eq!(queued.len(), 1);
    let (json, queued) = append_background_events(&serde_json::to_string(&queued).unwrap(), &[second], &rules);
    assert!(queued.is_empty());
    assert_eq!(serde_json::from_str::<Vec<QueueEvent>>(&json).unwrap().len(), 1);
    let (_, queued) = append_background_events(&json, &[third], &rules);
    assert_eq!(queued.len(), 1);
  }

  #[test]
  fn queue_dedupes_a_trade_for_five_minutes() {
    let first = QueueEvent {
      kind: "target".to_string(),
      trade_id: Some("t1".to_string()),
      level: Some(100.0),
      at: 1_000,
      ..QueueEvent::default()
    };
    let inside = QueueEvent {
      at: 1_000 + 4 * 60_000,
      ..first.clone()
    };
    let outside = QueueEvent {
      at: 1_000 + 5 * 60_000,
      ..first.clone()
    };
    let (json, _) = append_background_events("[]", &[first], &[]);
    let (_, queued) = append_background_events(&json, &[inside], &[]);
    assert!(queued.is_empty());
    let (_, queued) = append_background_events(&json, &[outside], &[]);
    assert_eq!(queued.len(), 1);
  }

  #[test]
  fn queue_keeps_different_levels_and_kinds_at_the_same_time() {
    let rule = Rule {
      id: "r1".to_string(),
      cooldown_minutes: 60,
      ..Rule::default()
    };
    let level = QueueEvent {
      kind: "level".to_string(),
      rule_id: Some("r1".to_string()),
      level: Some(100.0),
      at: 1_000,
      ..QueueEvent::default()
    };
    let stale = QueueEvent {
      kind: "stale".to_string(),
      level: None,
      ..level.clone()
    };
    let other = QueueEvent {
      level: Some(110.0),
      ..level.clone()
    };
    let (_, queued) = append_background_events("[]", &[level, stale, other], &[rule]);
    assert_eq!(queued.len(), 3);
  }

  #[test]
  fn queue_is_capped_at_two_hundred_and_drops_the_oldest() {
    let existing: Vec<QueueEvent> = (0..199)
      .map(|index| QueueEvent {
        kind: "level".to_string(),
        rule_id: Some(format!("r{index}")),
        level: Some(index as f64 + 1.0),
        at: 1_000,
        ..QueueEvent::default()
      })
      .collect();
    let existing_json = serde_json::to_string(&existing).unwrap();
    let fresh: Vec<QueueEvent> = (0..3)
      .map(|index| QueueEvent {
        kind: "level".to_string(),
        rule_id: Some(format!("n{index}")),
        level: Some(index as f64 + 1.0),
        at: 2_000,
        ..QueueEvent::default()
      })
      .collect();

    let (json, queued) = append_background_events(&existing_json, &fresh, &[]);
    let stored: Vec<QueueEvent> = serde_json::from_str(&json).unwrap();
    assert_eq!(stored.len(), QUEUE_CAP);
    assert_eq!(queued.len(), 3);
    assert_eq!(stored.first().unwrap().rule_id.as_deref(), Some("r2"));
    assert_eq!(stored.last().unwrap().rule_id.as_deref(), Some("n2"));
  }

  #[test]
  fn queue_ignores_a_corrupt_existing_payload() {
    let event = QueueEvent {
      kind: "level".to_string(),
      rule_id: Some("r1".to_string()),
      level: Some(100.0),
      at: 1_000,
      ..QueueEvent::default()
    };
    let (json, queued) = append_background_events("not json", &[event], &[]);
    assert_eq!(queued.len(), 1);
    assert_eq!(serde_json::from_str::<Vec<QueueEvent>>(&json).unwrap().len(), 1);
  }

  #[test]
  fn notification_groups_five_items_and_counts_the_rest() {
    let snapshot = Snapshot {
      notification: NotificationTemplate {
        title: "ClyTrade alerts".to_string(),
        body: "Background hit".to_string(),
      },
      ..Snapshot::default()
    };
    let events: Vec<QueueEvent> = (0..7)
      .map(|index| QueueEvent {
        symbol: format!("S{index}"),
        price: 10.0 + index as f64,
        level: Some(100.0 + index as f64),
        ..QueueEvent::default()
      })
      .collect();
    let payload = grouped_notification(&snapshot, &events).unwrap();
    assert_eq!(payload.title, "ClyTrade alerts");
    assert_eq!(
      payload.body,
      "Background hit\nS0 · 100\nS1 · 101\nS2 · 102\nS3 · 103\nS4 · 104\n+2 more"
    );
  }

  #[test]
  fn notification_is_absent_without_events() {
    assert!(grouped_notification(&Snapshot::default(), &[]).is_none());
  }

  #[test]
  fn binance_payload_parses_string_prices_and_skips_invalid_rows() {
    let refs = vec![MarketRef {
      key: "binance:BTCUSDT".to_string(),
      symbol: "BTC".to_string(),
      binance_symbol: Some("BTCUSDT".to_string()),
      coingecko_id: None,
    }];
    let prices = parse_binance_prices(
      r#"[{"symbol":"BTCUSDT","price":"101.5"},{"symbol":"ETHUSDT","price":"2"},{"symbol":"BTCUSDT","price":"-1"}]"#,
      &refs,
      5,
    );
    assert_eq!(prices.len(), 1);
    assert_eq!(prices[0].price, 101.5);
    assert_eq!(prices[0].key, "binance:BTCUSDT");
    assert_eq!(prices[0].provider, "binance");
    assert_eq!(prices[0].fetched_at, 5);
  }

  #[test]
  fn coingecko_payload_requires_a_positive_finite_number() {
    let refs = vec![MarketRef {
      key: "coingecko:bitcoin".to_string(),
      symbol: "BTC".to_string(),
      binance_symbol: None,
      coingecko_id: Some("bitcoin".to_string()),
    }];
    let prices = parse_coingecko_prices(
      r#"{"bitcoin":{"usd":100.25},"ethereum":{"usd":2}}"#,
      &refs,
      7,
    );
    assert_eq!(prices.len(), 1);
    assert_eq!(prices[0].price, 100.25);
    assert_eq!(prices[0].provider, "coingecko");

    let missing = parse_coingecko_prices(r#"{"bitcoin":{"usd":"100"}}"#, &refs, 7);
    assert!(missing.is_empty());
  }

  #[test]
  fn run_snapshot_keeps_once_rules_disabled_across_polls() {
    let snapshot = Snapshot {
      version: 1,
      stale_ms: 900_000,
      notification: NotificationTemplate {
        title: "ClyTrade alerts".to_string(),
        body: "Background hit".to_string(),
      },
      rules: vec![Rule {
        id: "r1".to_string(),
        symbol: "BTC".to_string(),
        kind: "price".to_string(),
        price_mode: Some("above".to_string()),
        level: Some(100.0),
        repeat: "once".to_string(),
        cooldown_minutes: 60,
        armed: true,
        enabled: true,
        binance_symbol: Some("BTCUSDT".to_string()),
        updated_at: 1,
        ..Rule::default()
      }],
      ..Snapshot::default()
    };
    let mut prices = HashMap::new();
    prices.insert(
      "binance:BTCUSDT".to_string(),
      Price {
        key: "binance:BTCUSDT".to_string(),
        symbol: "BTCUSDT".to_string(),
        provider: "binance".to_string(),
        price: 105.0,
        fetched_at: 1_000,
        source_timestamp: None,
      },
    );
    let mut cache = RuleStateCache::default();
    let first = run_snapshot(&snapshot, &prices, "[]", 2_000, &mut cache);
    assert_eq!(first.queued.len(), 1);
    assert_eq!(first.rule_updates[0].patch.enabled, Some(false));

    let second = run_snapshot(&snapshot, &prices, &first.queue_json, 3_000, &mut cache);
    assert!(second.events.is_empty());
    assert!(second.queued.is_empty());
  }

  #[test]
  fn run_snapshot_resets_state_when_the_rule_changes() {
    let mut snapshot = Snapshot {
      stale_ms: 900_000,
      rules: vec![Rule {
        id: "r1".to_string(),
        symbol: "BTC".to_string(),
        kind: "price".to_string(),
        price_mode: Some("above".to_string()),
        level: Some(100.0),
        repeat: "once".to_string(),
        cooldown_minutes: 60,
        armed: true,
        enabled: true,
        binance_symbol: Some("BTCUSDT".to_string()),
        updated_at: 1,
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
        price: 105.0,
        fetched_at: 1_000,
        ..Price::default()
      },
    );
    let mut cache = RuleStateCache::default();
    let first = run_snapshot(&snapshot, &prices, "[]", 2_000, &mut cache);
    assert_eq!(first.queued.len(), 1);

    snapshot.rules[0].updated_at = 2;
    let second = run_snapshot(&snapshot, &prices, "[]", 3_000, &mut cache);
    assert_eq!(second.queued.len(), 1);
  }
}
