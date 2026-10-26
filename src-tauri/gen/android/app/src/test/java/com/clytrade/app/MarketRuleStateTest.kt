package com.clytrade.app

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.io.File

class MarketRuleStateTest {
    @get:Rule
    val temporaryFolder = TemporaryFolder()

    private fun snapshot(updatedAt: Long = 1): Snapshot =
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
                        repeatMode = "cross-back",
                        cooldownMinutes = 60,
                        lastPrice = 90.0,
                        armed = true,
                        enabled = true,
                        binanceSymbol = "BTCUSDT",
                        updatedAt = updatedAt,
                    ),
                ),
        )

    private fun prices(
        price: Double,
        at: Long,
    ): Map<String, Price> =
        mapOf(
            "binance:BTCUSDT" to
                Price(
                    key = "binance:BTCUSDT",
                    symbol = "BTCUSDT",
                    provider = "binance",
                    price = price,
                    fetchedAt = at,
                ),
        )

    @Test
    fun cross_back_rule_fires_rearms_and_fires_again_across_worker_runs() {
        val file = File(temporaryFolder.root, MarketRuleStateStore.STATE_FILE)
        val snapshot = snapshot()
        var queue = "[]"

        fun run(
            now: Long,
            price: Double,
        ): SnapshotRun {
            val cache = RuleStateCache()
            MarketRuleStateStore.seed(file, snapshot, cache, queue)
            val result = runSnapshot(snapshot, prices(price, now), queue, now, cache)
            if (result.ruleUpdates.isNotEmpty()) {
                assertTrue(MarketRuleStateStore.write(file, snapshot, cache, now))
            }
            queue = result.queueJson
            return result
        }

        val first = run(2_000, 105.0)
        assertEquals(1, first.events.size)
        assertEquals(false, first.ruleUpdates[0].patch.armed)

        val second = run(3_000, 95.0)
        assertTrue(second.events.isEmpty())
        assertEquals(true, second.ruleUpdates[0].patch.armed)

        val third = run(4_000, 105.0)
        assertEquals(1, third.events.size)
        assertEquals(false, third.ruleUpdates[0].patch.armed)
    }

    @Test
    fun state_file_round_trips_the_rule_state() {
        val file = File(temporaryFolder.root, MarketRuleStateStore.STATE_FILE)
        val snapshot = snapshot()
        val cache = RuleStateCache()
        cache.states["r1"] =
            CachedRuleState(
                updatedAt = 1,
                lastPrice = 105.0,
                armed = false,
                lastFiredAt = 2_000,
                referencePrice = 104.0,
                enabled = true,
            )
        assertTrue(MarketRuleStateStore.write(file, snapshot, cache, 2_500))

        val loaded = RuleStateCache()
        MarketRuleStateStore.seed(file, snapshot, loaded, "[]")
        assertEquals(1, loaded.states.size)
        val state = loaded.states["r1"]!!
        assertEquals(1L, state.updatedAt)
        assertEquals(105.0, state.lastPrice)
        assertEquals(false, state.armed)
        assertEquals(2_000L, state.lastFiredAt)
        assertEquals(104.0, state.referencePrice)
        assertEquals(true, state.enabled)
    }

    @Test
    fun state_file_ignores_a_rule_whose_updated_at_changed() {
        val file = File(temporaryFolder.root, MarketRuleStateStore.STATE_FILE)
        val cache = RuleStateCache()
        cache.states["r1"] =
            CachedRuleState(
                updatedAt = 1,
                lastPrice = 105.0,
                armed = false,
                lastFiredAt = 2_000,
                referencePrice = null,
                enabled = false,
            )
        assertTrue(MarketRuleStateStore.write(file, snapshot(updatedAt = 1), cache, 2_500))

        val loaded = RuleStateCache()
        MarketRuleStateStore.seed(file, snapshot(updatedAt = 2), loaded, "[]")
        assertTrue(loaded.states.isEmpty())
    }

    @Test
    fun state_file_ignores_missing_and_invalid_files() {
        val missing = File(temporaryFolder.root, "missing.json")
        val cache = RuleStateCache()
        MarketRuleStateStore.seed(missing, snapshot(), cache, "[]")
        assertTrue(cache.states.isEmpty())

        val invalid = File(temporaryFolder.root, "invalid.json")
        invalid.writeText("not json")
        MarketRuleStateStore.seed(invalid, snapshot(), cache, "[]")
        assertTrue(cache.states.isEmpty())
    }

    @Test
    fun newer_queue_state_wins_over_an_older_state_file() {
        val file = File(temporaryFolder.root, MarketRuleStateStore.STATE_FILE)
        val snapshot = snapshot()
        val cache = RuleStateCache()
        cache.states["r1"] =
            CachedRuleState(
                updatedAt = 1,
                lastPrice = 90.0,
                armed = true,
                lastFiredAt = 1_000,
                referencePrice = null,
                enabled = true,
            )
        assertTrue(MarketRuleStateStore.write(file, snapshot, cache, 1_500))

        val queued =
            QueueEvent(
                kind = "level",
                ruleId = "r1",
                level = 100.0,
                at = 2_000,
                ruleState =
                    RuleState(
                        armed = false,
                        lastPrice = 105.0,
                        lastFiredAt = 2_000,
                        referencePrice = null,
                        enabled = true,
                    ),
            )
        val loaded = RuleStateCache()
        MarketRuleStateStore.seed(file, snapshot, loaded, "[${queued.toJson()}]")
        assertEquals(false, loaded.states["r1"]!!.armed)
        assertEquals(105.0, loaded.states["r1"]!!.lastPrice)
    }
}
