package com.clytrade.app

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

private fun canonical(value: Any?): Any? =
    when (value) {
        null, JSONObject.NULL -> null
        is JSONObject -> value.keys().asSequence().associateWith { canonical(value.get(it)) }
        is JSONArray -> (0 until value.length()).map { canonical(value.get(it)) }
        is Number -> value.toDouble()
        else -> value
    }

private fun fixture(): JSONObject {
    val stream =
        Thread.currentThread().contextClassLoader?.getResourceAsStream("evaluation-cases.json")
            ?: error("evaluation-cases.json is missing from test resources")
    return JSONObject(stream.bufferedReader().use { it.readText() })
}

private fun JSONObject.tradeList(): List<Trade> = objectArray("trades").map(Trade::fromJson)

private fun JSONObject.ruleList(): List<Rule> = objectArray("rules").map(Rule::fromJson)

private fun JSONObject.priceMap(): Map<String, Price> {
    val rows = getJSONArray("prices")
    val prices = mutableMapOf<String, Price>()
    for (index in 0 until rows.length()) {
        val price = Price.fromJson(rows.getJSONObject(index))
        prices[price.key] = price
    }
    return prices
}

class MarketEvaluatorTest {
    @Test
    fun shared_fixture_has_the_expected_shape() {
        val fixture = fixture()
        assertEquals(1, fixture.getInt("version"))
        assertEquals(79, fixture.getJSONArray("cases").length())
    }

    @Test
    fun shared_fixture_cases_match() {
        val cases = fixture().getJSONArray("cases")
        for (index in 0 until cases.length()) {
            val case = cases.getJSONObject(index)
            val result =
                evaluatePrices(
                    EvaluationInput(
                        now = case.getLong("now"),
                        prices = case.priceMap(),
                        trades = case.tradeList(),
                        rules = case.ruleList(),
                        staleMs = case.getLong("staleMs"),
                    ),
                )
            assertEquals(
                "fixture case failed: ${case.getString("name")}",
                canonical(case.getJSONObject("expected")),
                canonical(result.toJson()),
            )
        }
    }

    @Test
    fun price_key_prefers_binance_then_coingecko_then_symbol() {
        assertEquals("binance:BTCUSDT", priceKeyFor("BTCUSDT", "bitcoin", "BTC"))
        assertEquals("coingecko:bitcoin", priceKeyFor(null, "bitcoin", "BTC"))
        assertEquals("symbol:BTC", priceKeyFor(null, null, " btc "))
        assertEquals("coingecko:bitcoin", priceKeyFor("", "bitcoin", "BTC"))
    }

    @Test
    fun market_refs_dedupe_by_key_and_skip_closed_or_unmapped_entries() {
        val snapshot =
            Snapshot(
                trades =
                    listOf(
                        Trade(
                            id = "t1",
                            symbol = "BTC",
                            status = "open",
                            targetPrice = 100.0,
                            binanceSymbol = "BTCUSDT",
                        ),
                        Trade(
                            id = "t2",
                            symbol = "BTC",
                            status = "open",
                            targetPrice = 100.0,
                            binanceSymbol = "BTCUSDT",
                        ),
                        Trade(
                            id = "t3",
                            symbol = "ETH",
                            status = "closed",
                            targetPrice = 100.0,
                            binanceSymbol = "ETHUSDT",
                        ),
                    ),
                rules =
                    listOf(
                        Rule(
                            id = "r1",
                            symbol = "SOL",
                            enabled = true,
                            coingeckoId = "solana",
                        ),
                        Rule(
                            id = "r2",
                            symbol = "NONE",
                            enabled = true,
                        ),
                    ),
            )
        val refs = marketRefs(snapshot)
        assertEquals(2, refs.size)
        assertEquals("binance:BTCUSDT", refs[0].key)
        assertEquals("coingecko:solana", refs[1].key)

        val binance = providerCandidates(refs, "binance")
        assertEquals(1, binance.size)
        assertEquals("binance:BTCUSDT", binance[0].key)
        val coingecko = providerCandidates(refs, "coingecko")
        assertEquals(1, coingecko.size)
        assertEquals("coingecko:solana", coingecko[0].key)

        val uncovered = uncoveredRefs(refs, setOf("binance:BTCUSDT"))
        assertEquals(1, uncovered.size)
        assertEquals("coingecko:solana", uncovered[0].key)
    }

    @Test
    fun market_refs_merge_a_missing_coingecko_mapping_from_a_duplicate_key() {
        val snapshot =
            Snapshot(
                trades =
                    listOf(
                        Trade(
                            id = "t1",
                            symbol = "BTC",
                            status = "open",
                            targetPrice = 100.0,
                            binanceSymbol = "BTCUSDT",
                            coingeckoId = null,
                        ),
                    ),
                rules =
                    listOf(
                        Rule(
                            id = "r1",
                            symbol = "BTC",
                            enabled = true,
                            binanceSymbol = "BTCUSDT",
                            coingeckoId = "bitcoin",
                        ),
                    ),
            )
        val refs = marketRefs(snapshot)
        assertEquals(1, refs.size)
        assertEquals("binance:BTCUSDT", refs[0].key)
        assertEquals("BTCUSDT", refs[0].binanceSymbol)
        assertEquals("bitcoin", refs[0].coingeckoId)
    }

    @Test
    fun run_snapshot_keeps_once_rules_disabled_across_polls() {
        val snapshot =
            Snapshot(
                staleMs = 900_000,
                rules =
                    listOf(
                        Rule(
                            id = "r1",
                            symbol = "BTC",
                            kind = "price",
                            priceMode = "above",
                            level = 100.0,
                            repeatMode = "once",
                            cooldownMinutes = 60,
                            armed = true,
                            enabled = true,
                            binanceSymbol = "BTCUSDT",
                            updatedAt = 1,
                        ),
                    ),
            )
        val prices =
            mapOf(
                "binance:BTCUSDT" to
                    Price(
                        key = "binance:BTCUSDT",
                        symbol = "BTCUSDT",
                        provider = "binance",
                        price = 105.0,
                        fetchedAt = 1_000,
                    ),
            )
        val cache = RuleStateCache()
        val first = runSnapshot(snapshot, prices, "[]", 2_000, cache)
        assertEquals(1, first.queued.size)
        assertEquals(false, first.ruleUpdates[0].patch.enabled)

        val second = runSnapshot(snapshot, prices, first.queueJson, 3_000, cache)
        assertTrue(second.events.isEmpty())
        assertTrue(second.queued.isEmpty())
    }

    @Test
    fun run_snapshot_seeds_rule_state_from_the_queued_events() {
        val snapshot =
            Snapshot(
                staleMs = 900_000,
                rules =
                    listOf(
                        Rule(
                            id = "r1",
                            symbol = "BTC",
                            kind = "price",
                            priceMode = "above",
                            level = 100.0,
                            repeatMode = "once",
                            cooldownMinutes = 60,
                            armed = true,
                            enabled = true,
                            binanceSymbol = "BTCUSDT",
                            updatedAt = 1,
                        ),
                    ),
            )
        val prices =
            mapOf(
                "binance:BTCUSDT" to
                    Price(
                        key = "binance:BTCUSDT",
                        symbol = "BTCUSDT",
                        provider = "binance",
                        price = 105.0,
                        fetchedAt = 1_000,
                    ),
            )
        val first = runSnapshot(snapshot, prices, "[]", 2_000, RuleStateCache())
        assertEquals(1, first.queued.size)

        val cache = RuleStateCache()
        seedRuleCacheFromQueue(cache, snapshot, first.queueJson)
        val second = runSnapshot(snapshot, prices, first.queueJson, 3_000, cache)
        assertTrue(second.events.isEmpty())
        assertTrue(second.queued.isEmpty())
    }

    @Test
    fun run_snapshot_resets_state_when_the_rule_changes() {
        var snapshot =
            Snapshot(
                staleMs = 900_000,
                rules =
                    listOf(
                        Rule(
                            id = "r1",
                            symbol = "BTC",
                            kind = "price",
                            priceMode = "above",
                            level = 100.0,
                            repeatMode = "once",
                            cooldownMinutes = 60,
                            armed = true,
                            enabled = true,
                            binanceSymbol = "BTCUSDT",
                            updatedAt = 1,
                        ),
                    ),
            )
        val prices =
            mapOf(
                "binance:BTCUSDT" to
                    Price(
                        key = "binance:BTCUSDT",
                        symbol = "BTCUSDT",
                        provider = "binance",
                        price = 105.0,
                        fetchedAt = 1_000,
                    ),
            )
        val cache = RuleStateCache()
        val first = runSnapshot(snapshot, prices, "[]", 2_000, cache)
        assertEquals(1, first.queued.size)

        snapshot = snapshot.copy(rules = listOf(snapshot.rules[0].copy(updatedAt = 2)))
        val second = runSnapshot(snapshot, prices, "[]", 3_000, cache)
        assertEquals(1, second.queued.size)
    }

    @Test
    fun stale_trade_review_has_a_null_level_and_no_close() {
        val snapshot =
            Snapshot(
                staleMs = 900_000,
                trades =
                    listOf(
                        Trade(
                            id = "t1",
                            symbol = "BTC",
                            direction = "long",
                            status = "open",
                            targetPrice = 100.0,
                            stopPrice = 90.0,
                            autoClose = true,
                            binanceSymbol = "BTCUSDT",
                        ),
                    ),
            )
        val prices =
            mapOf(
                "binance:BTCUSDT" to
                    Price(
                        key = "binance:BTCUSDT",
                        symbol = "BTCUSDT",
                        provider = "binance",
                        price = 105.0,
                        fetchedAt = 0,
                    ),
            )
        val result =
            evaluatePrices(
                EvaluationInput(
                    now = 900_000,
                    prices = prices,
                    trades = snapshot.trades,
                    rules = snapshot.rules,
                    staleMs = snapshot.staleMs,
                ),
            )
        assertEquals(0, result.events.size)
        assertEquals(0, result.closes.size)
        assertEquals(1, result.reviews.size)
        assertEquals("stale", result.reviews[0].kind)
        assertEquals(null, result.reviews[0].level)
    }

    @Test
    fun queued_rule_event_carries_the_updated_rule_state() {
        val snapshot =
            Snapshot(
                staleMs = 900_000,
                rules =
                    listOf(
                        Rule(
                            id = "r1",
                            symbol = "BTC",
                            kind = "price",
                            priceMode = "above",
                            level = 100.0,
                            repeatMode = "once",
                            cooldownMinutes = 60,
                            armed = true,
                            enabled = true,
                            binanceSymbol = "BTCUSDT",
                            updatedAt = 1,
                        ),
                    ),
            )
        val prices =
            mapOf(
                "binance:BTCUSDT" to
                    Price(
                        key = "binance:BTCUSDT",
                        symbol = "BTCUSDT",
                        provider = "binance",
                        price = 105.0,
                        fetchedAt = 1_000,
                    ),
            )
        val run = runSnapshot(snapshot, prices, "[]", 2_000, RuleStateCache())
        assertEquals(1, run.queued.size)
        val event = run.queued[0]
        assertEquals("level", event.kind)
        assertEquals("r1", event.ruleId)
        assertEquals(100.0, event.level)
        assertEquals("binance", event.provider)
        assertEquals("long", event.direction)
        assertEquals("bg:2000:level:rule:r1:100", event.id)
        assertFalse(event.ruleState!!.enabled)
        assertEquals(true, event.ruleState!!.armed)
        assertEquals(2_000L, event.ruleState!!.lastFiredAt)
        assertEquals(105.0, event.ruleState!!.lastPrice)
    }
}
