package com.clytrade.app

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.io.File

class MarketSnapshotTest {
    @get:Rule
    val temporaryFolder = TemporaryFolder()

    @Test
    fun parses_monitoring_off_snapshot_with_defaults() {
        val snapshot = Snapshot.parse("""{"backgroundMonitoring":false}""")
        assertTrue(snapshot != null)
        assertEquals(false, snapshot!!.backgroundMonitoring)
        assertEquals("auto", snapshot.provider)
        assertEquals(DEFAULT_STALE_MS, snapshot.staleMs)
        assertEquals("unset", snapshot.windowsCloseBehavior)
        assertTrue(snapshot.trades.isEmpty())
        assertTrue(snapshot.rules.isEmpty())
    }

    @Test
    fun parses_the_full_snapshot_contract() {
        val raw =
            JSONObject()
                .put("version", 1)
                .put("generatedAt", 1_700_000_000_000)
                .put("locale", "fa")
                .put("provider", "coingecko")
                .put("coingeckoKey", "demo-key")
                .put("backgroundMonitoring", true)
                .put("windowsCloseBehavior", "tray")
                .put("staleMs", 900_000)
                .put(
                    "notification",
                    JSONObject().put("title", "ClyTrade alerts").put("body", "Background hit"),
                )
                .put(
                    "trades",
                    org.json.JSONArray().put(
                        JSONObject()
                            .put("id", "t1")
                            .put("symbol", "BTC")
                            .put("direction", "short")
                            .put("targetPrice", 90.0)
                            .put("stopPrice", 110.0)
                            .put("autoClose", true)
                            .put("binanceSymbol", "BTCUSDT")
                            .put("coingeckoId", JSONObject.NULL)
                            .put("updatedAt", 5)
                            .put("priceKey", "binance:BTCUSDT"),
                    ),
                )
                .put(
                    "rules",
                    org.json.JSONArray().put(
                        JSONObject()
                            .put("id", "r1")
                            .put("symbol", "BTC")
                            .put("kind", "price")
                            .put("priceMode", "above")
                            .put("level", 100.0)
                            .put("repeat", "cross-back")
                            .put("cooldownMinutes", 60)
                            .put("armed", true)
                            .put("enabled", true)
                            .put("binanceSymbol", "BTCUSDT")
                            .put("updatedAt", 7),
                    ),
                )

        val snapshot = Snapshot.parse(raw.toString())!!
        assertEquals("fa", snapshot.locale)
        assertEquals("coingecko", snapshot.provider)
        assertEquals("demo-key", snapshot.coingeckoKey)
        assertEquals("tray", snapshot.windowsCloseBehavior)
        assertEquals("ClyTrade alerts", snapshot.notification.title)
        assertEquals(1, snapshot.trades.size)
        assertEquals("open", snapshot.trades[0].status)
        assertEquals("short", snapshot.trades[0].direction)
        assertEquals(90.0, snapshot.trades[0].targetPrice)
        assertNull(snapshot.trades[0].coingeckoId)
        assertEquals(1, snapshot.rules.size)
        assertEquals("cross-back", snapshot.rules[0].repeatMode)
        assertEquals(60L, snapshot.rules[0].cooldownMinutes)
        assertEquals(true, snapshot.rules[0].enabled)
    }

    @Test
    fun invalid_json_returns_null() {
        assertNull(Snapshot.parse("not json"))
        assertNull(Snapshot.parse(""))
        assertNull(Snapshot.parse("[]"))
        assertNull(Snapshot.parse("""{"trades":"nope"}"""))
        assertNull(Snapshot.parse("""{"trades":[1]}"""))
        assertNull(Snapshot.parse("""{"staleMs":"soon"}"""))
    }

    @Test
    fun missing_snapshot_file_reads_as_null() {
        val file = File(temporaryFolder.root, "background-snapshot.json")
        assertNull(MarketSnapshotStore.read(file))
    }

    @Test
    fun valid_snapshot_file_is_read() {
        val file = File(temporaryFolder.root, "background-snapshot.json")
        file.writeText("""{"backgroundMonitoring":true}""")
        val snapshot = MarketSnapshotStore.read(file)
        assertTrue(snapshot != null)
        assertTrue(snapshot!!.backgroundMonitoring)
    }

    @Test
    fun invalid_snapshot_file_reads_as_null() {
        val file = File(temporaryFolder.root, "background-snapshot.json")
        file.writeText("not json")
        assertNull(MarketSnapshotStore.read(file))
    }

    @Test
    fun write_rejects_a_non_object_payload() {
        val file = File(temporaryFolder.root, "background-snapshot.json")
        assertFalse(MarketSnapshotStore.write(file, "[]"))
        assertFalse(file.exists())
        assertTrue(MarketSnapshotStore.write(file, """{"backgroundMonitoring":true}"""))
        assertTrue(file.exists())
    }
}
