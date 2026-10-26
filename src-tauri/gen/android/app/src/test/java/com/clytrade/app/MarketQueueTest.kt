package com.clytrade.app

import org.json.JSONArray
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class MarketQueueTest {
    @Test
    fun queue_dedupes_a_rule_inside_its_cooldown() {
        val rules = listOf(Rule(id = "r1", repeatMode = "cooldown", cooldownMinutes = 60))
        val first = QueueEvent(kind = "level", ruleId = "r1", level = 100.0, at = 1_000)
        val second = first.copy(at = 1_000 + 30 * 60_000)
        val third = first.copy(at = 1_000 + 61 * 60_000)

        val firstAppend = MarketQueue.appendEvents("[]", listOf(first), rules)
        assertEquals(1, firstAppend.retained.size)
        val secondAppend = MarketQueue.appendEvents(firstAppend.json, listOf(second), rules)
        assertTrue(secondAppend.retained.isEmpty())
        assertEquals(1, MarketQueue.parseEvents(secondAppend.json).size)
        val thirdAppend = MarketQueue.appendEvents(secondAppend.json, listOf(third), rules)
        assertEquals(1, thirdAppend.retained.size)
    }

    @Test
    fun queue_keeps_a_trade_event_while_it_remains_queued() {
        val first =
            QueueEvent(
                id = "bg:1000:target:trade:t1:100",
                kind = "target",
                tradeId = "t1",
                level = 100.0,
                at = 1_000,
            )
        val later = first.copy(id = "bg:301001:target:trade:t1:100", at = 1_000 + 5 * 60_000 + 1_000)
        val (json, _) = MarketQueue.appendEvents("[]", listOf(first), emptyList())
        val second = MarketQueue.appendEvents(json, listOf(later), emptyList())
        assertTrue(second.retained.isEmpty())
    }

    @Test
    fun queue_allows_a_cross_back_rule_to_fire_again_while_the_old_event_is_queued() {
        val rule = Rule(id = "r1", repeatMode = "cross-back", cooldownMinutes = 60)
        val first =
            QueueEvent(
                id = "bg:1000:level:rule:r1:100",
                kind = "level",
                ruleId = "r1",
                level = 100.0,
                at = 1_000,
            )
        val second = first.copy(id = "bg:2000:level:rule:r1:100", at = 2_000)
        val firstAppend = MarketQueue.appendEvents("[]", listOf(first), listOf(rule))
        val secondAppend = MarketQueue.appendEvents(firstAppend.json, listOf(second), listOf(rule))
        assertEquals(1, secondAppend.retained.size)
    }

    @Test
    fun queue_keeps_valid_entries_when_one_entry_is_malformed() {
        val valid =
            QueueEvent(
                id = "valid",
                kind = "level",
                ruleId = "r1",
                level = 100.0,
                at = 1_000,
            )
        val rows = JSONArray().put(valid.toJson()).put("not-an-event")
        val result = MarketQueue.appendEvents(rows.toString(), emptyList(), emptyList())
        val stored = MarketQueue.parseEvents(result.json)
        assertEquals(1, stored.size)
        assertEquals("valid", stored[0].id)
    }

    @Test
    fun queue_keeps_different_levels_and_kinds_at_the_same_time() {
        val rule = Rule(id = "r1", repeatMode = "cooldown", cooldownMinutes = 60)
        val level =
            QueueEvent(
                kind = "level",
                ruleId = "r1",
                level = 100.0,
                at = 1_000,
            )
        val duplicate = level.copy(at = 1_500)
        val stale = level.copy(kind = "stale", level = null)
        val other = level.copy(level = 110.0)
        val result =
            MarketQueue.appendEvents(
                "[]",
                listOf(level, duplicate, stale, other),
                listOf(rule),
            )
        assertEquals(3, result.retained.size)
    }

    @Test
    fun queue_is_capped_at_two_hundred_and_drops_the_oldest() {
        val existing =
            (0 until 199).map { index ->
                QueueEvent(
                    kind = "level",
                    ruleId = "r$index",
                    level = index.toDouble() + 1.0,
                    at = 1_000,
                )
            }
        val existingJson = JSONArray(existing.map { it.toJson() }).toString()
        val fresh =
            (0 until 3).map { index ->
                QueueEvent(
                    kind = "level",
                    ruleId = "n$index",
                    level = index.toDouble() + 1.0,
                    at = 2_000,
                )
            }

        val result = MarketQueue.appendEvents(existingJson, fresh, emptyList())
        val stored = MarketQueue.parseEvents(result.json)
        assertEquals(QUEUE_CAP, stored.size)
        assertEquals(3, result.retained.size)
        assertEquals("r2", stored.first().ruleId)
        assertEquals("n2", stored.last().ruleId)
    }

    @Test
    fun queue_ignores_a_corrupt_existing_payload() {
        val event =
            QueueEvent(
                kind = "level",
                ruleId = "r1",
                level = 100.0,
                at = 1_000,
            )
        val result = MarketQueue.appendEvents("not json", listOf(event), emptyList())
        assertEquals(1, result.retained.size)
        assertEquals(1, MarketQueue.parseEvents(result.json).size)
    }

    @Test
    fun queue_round_trips_the_rule_state_wire_shape() {
        val event =
            QueueEvent(
                id = "bg:2000:percent:rule:r1:none",
                kind = "percent",
                ruleId = "r1",
                symbol = "BTC",
                price = 105.0,
                level = null,
                at = 2_000,
                provider = "binance",
                direction = "long",
                ruleState =
                    RuleState(
                        armed = false,
                        lastPrice = 105.0,
                        lastFiredAt = 2_000,
                        referencePrice = 105.0,
                        enabled = false,
                    ),
            )
        val parsed = MarketQueue.parseEvents(JSONArray().put(event.toJson()).toString())
        assertEquals(1, parsed.size)
        assertEquals(event, parsed[0])

        val json = event.toJson()
        assertTrue(json.has("level"))
        assertEquals(true, json.isNull("level"))
        assertTrue(json.has("ruleState"))
        assertEquals(false, json.getJSONObject("ruleState").getBoolean("enabled"))
        assertEquals(true, json.getJSONObject("ruleState").isNull("referencePrice").not())
    }

    @Test
    fun queue_drops_events_with_invalid_rule_state() {
        val raw =
            JSONArray()
                .put(
                    QueueEvent(
                        id = "valid",
                        kind = "level",
                        ruleId = "r1",
                        level = 100.0,
                        at = 1_000,
                    ).toJson(),
                )
                .put(
                    org.json.JSONObject()
                        .put("id", "invalid")
                        .put("kind", "level")
                        .put("ruleId", "r1")
                        .put("level", 100.0)
                        .put("at", 1_000)
                        .put("ruleState", "not-an-object"),
                )
        val parsed = MarketQueue.parseEvents(raw.toString())
        assertEquals(1, parsed.size)
        assertEquals("valid", parsed[0].id)
    }

    @Test
    fun queue_does_not_dedupe_unknown_rules() {
        val first = QueueEvent(kind = "level", ruleId = "missing", level = 100.0, at = 1_000)
        val second = first.copy(at = 2_000)
        val result = MarketQueue.appendEvents("[]", listOf(first, second), emptyList())
        assertEquals(2, result.retained.size)
    }

    @Test
    fun queue_keeps_events_without_a_rule_or_trade() {
        val event = QueueEvent(kind = "conflict", symbol = "BTC", price = 100.0, at = 1_000)
        val result = MarketQueue.appendEvents("[]", listOf(event, event.copy(at = 2_000)), emptyList())
        assertEquals(2, result.retained.size)
    }

    @Test
    fun queue_event_defaults_match_the_native_contract() {
        val event = QueueEvent.fromJson(org.json.JSONObject())
        assertEquals("", event.id)
        assertEquals("", event.kind)
        assertEquals("long", event.direction)
        assertNull(event.ruleState)
    }
}
