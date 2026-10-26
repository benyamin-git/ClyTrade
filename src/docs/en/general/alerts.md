# Alerts

## What it is for

The Alerts tab watches crypto prices so you do not have to keep the chart open.
It covers two things:

- **Custom rules** you create for a coin: a price level, a range, or a percent
  move.
- **Every open journal trade** with a target or a stop, whether or not
  auto-close is on.

Hits land in the in-app inbox and, when the platform allows it, as an operating
system notification. The tab shows a status strip, the active rules, a review
queue and the last 500 events.

## Rules

- **Price rules** fire **above** a level, **below** a level, when the price
  **crosses** it, or when it leaves a **range**.
- **Percent rules** compare the current price with a reference price: up, down
  or either direction. The reference is set when the rule is created and reset
  after a fire.
- **Repeat** is **Once** (the rule pauses after firing), **Cross-back** (it
  re-arms when the price returns to the other side) or **Cooldown** (it can fire
  again after 15 to 1440 minutes while the condition still holds; the default
  is 60).
- Trade rows are generated from the Journal: the pencil opens the trade form,
  and the row disappears when the trade closes or loses its levels. Every open
  trade with a target or stop is watched even when auto-close is off, because
  you still want to know the level was reached.

Rules can be paused, resumed, edited and deleted. The status strip names the
selected provider, the provider that actually answered, the last successful
refresh, the next allowed refresh and the current error.

## Automatic close

With a trade's **Auto-close** toggle on, a single fresh target or stop hit closes
the trade at the exact level. The trade gets the `auto-closed` tag and a note
naming the symbol, level and reason, so the journal shows how it ended. Edit the
trade afterwards to correct the exit price, date or note.

Auto-close is deliberately conservative:

- The price must be **less than 15 minutes old**.
- Exactly one of target and stop must be hit.
- If both are crossed in one refresh, nothing closes: a **gap** review item lets
  you close at the target or the stop.
- If the price is stale, nothing closes: a **stale** review item offers a
  refresh.
- A background hit that no longer matches the trade (it was edited, closed, or
  is more than 24 hours old) becomes a **conflict** review item.

Review items are never applied silently. You choose to close, edit, refresh or
dismiss.

## Prices and limits

There is no price server. The app talks directly to Binance and CoinGecko over
HTTPS, which is what keeps the local-first promise: no account, no proxy and no
third party seeing your journal.

One shared cache serves every screen. The first screen that needs a price fills
the cache; the Portfolio and Alerts lists and every open trade, asset or rule
form then read the same entry. The scheduler also shares one in-flight request
per provider and keeps a per-provider request budget, so several tabs do not
become several requests.

| Situation                                 | Freshness          |
| ----------------------------------------- | ------------------ |
| List pages (Portfolio, Alerts)            | 5 minutes          |
| An open trade, asset or rule form         | 30 seconds         |
| Foreground timer while the app is visible | 5 minutes          |
| Manual **Refresh prices**                 | 60-second cooldown |

The 15-minute stale guard is separate from those refresh intervals. A cached
price may be reused for five minutes, but if the newest price is 15 minutes old
when a level is crossed, ClyTrade does not alert or close on it. Instead it shows
a stale badge in the Portfolio and a stale review item in Alerts. Acting on an
old quote would be worse than waiting.

The app's budgets are conservative fractions of the published limits: Binance 60
requests and 1,200 weight per minute; CoinGecko 6 requests per minute without a
key. Failures back off from 30 seconds to 15 minutes. **Auto** tries Binance
first and falls back to CoinGecko; a pinned provider surfaces its error instead
of switching silently.

Only crypto is covered in 0.5. Forex, stocks and the other markets stay manual.

## Background monitoring

Background monitoring is off by default. Turning it on asks for notification
permission; if you deny it, the in-app inbox and unread badge keep working.

- **Android** runs a WorkManager job about every 15 minutes when a network is
  available. Android may delay it under Doze or battery optimization, so treat
  the interval as best effort. A notification tap opens the Alerts tab.
- **Windows** runs a timer every 5 minutes while ClyTrade stays in the tray. The
  first close with monitoring on asks whether to hide to the tray or quit; the
  choice can be changed in Preferences. Quitting stops monitoring.
- **PWA** has no background mode. Prices are checked every 5 minutes while the
  tab is open and visible; nothing runs after you close it.

The native apps cannot write the database while the webview is gone. They read
a snapshot, detect hits and queue them. The app imports the queue on its next
open or when you return to it, revalidates each hit against the trade, and only
then closes anything. This is why a background close can appear a little later,
and why a queued hit that no longer matches the trade becomes a review item
instead of a close.

Multiple hits in one poll become one grouped notification. Notification text can
reveal a symbol or level on a lock screen; 0.5 has no privacy mode.

## The CoinGecko key

CoinGecko works without an account. ClyTrade budgets it at 6 requests per
minute without a key; a free Demo key raises that local budget to 30 requests
per minute and 2-second spacing, within the Demo plan's roughly 10,000 calls
per month. That matters if you watch many coins or keep several tabs open.

The key is optional, stored only on this device, masked in Preferences and
excluded from every backup. It is sent to CoinGecko as a request header and to
no other host. The Android and Windows background engines also need it to poll
while the app is closed, so it is part of the app-private background snapshot;
that file never leaves the device and is not exported.

## Why it works this way

- **A server would break the promise.** Push notifications normally need a
  backend that knows your positions. Fetching directly from the providers keeps
  the app account-free and lets it work offline for everything except prices.
- **One cache is a budget strategy, not an optimization.** Providers rate-limit
  by IP. Sharing one cache and one scheduler is what makes several tabs and a
  5-minute timer affordable.
- **Stale prices never trade for you.** The 15-minute guard is the difference
  between an alert and a guess. A missed alert is recoverable; a wrong close is
  in your statistics forever.
- **Exact levels keep statistics predictable.** An auto-close uses the target or
  stop you set, not the first tick that crossed it, so R multiples and equity
  curves match the plan you wrote down. The actual observed price is still in
  the alert event.
- **Ambiguity goes to review.** Gaps, stale quotes and changed trades are
  exactly the cases where an automatic decision would be wrong.
- **Background is best effort.** No operating system promises exact timing to
  background work. The app says so instead of implying a guarantee.
