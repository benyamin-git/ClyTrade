package com.clytrade.app

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class MarketNotificationsTest {
    private fun event(
        symbol: String,
        level: Double? = 100.0,
        price: Double = 100.0,
    ): QueueEvent = QueueEvent(symbol = symbol, level = level, price = price)

    private fun template(
        title: String = "ClyTrade alerts",
        body: String = "Background hit",
        more: String = "+{{count}} more",
    ): NotificationTemplate =
        NotificationTemplate(
            title = title,
            body = body,
            more = more,
        )

    @Test
    fun pins_the_notification_contract_constants() {
        assertEquals("clytrade_alerts", MarketNotifications.CHANNEL_ID)
        assertEquals(1, MarketNotifications.NOTIFICATION_ID)
        assertEquals("open_alerts", MarketNotifications.EXTRA_OPEN_ALERTS)
        assertEquals("/alerts/overview", MarketNotifications.ALERTS_ROUTE)
        assertEquals(5, MarketNotifications.MAX_ITEMS)
        assertEquals(R.drawable.ic_stat_clytrade, MarketNotifications.SMALL_ICON)
        assertEquals(
            Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP,
            MarketNotifications.ALERT_INTENT_FLAGS,
        )
        assertEquals(
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            MarketNotifications.PENDING_INTENT_FLAGS,
        )
    }

    @Test
    fun channel_spec_pins_the_channel_contract() {
        val spec = MarketNotifications.channelSpec(template(), "ClyTrade")

        assertEquals("clytrade_alerts", spec.id)
        assertEquals("ClyTrade alerts", spec.name)
        assertEquals(NotificationManager.IMPORTANCE_DEFAULT, spec.importance)
        assertEquals("Background hit", spec.description)
    }

    @Test
    fun channel_spec_falls_back_to_the_app_name() {
        val spec = MarketNotifications.channelSpec(template(title = ""), "ClyTrade")

        assertEquals("ClyTrade", spec.name)
    }

    @Test
    fun alert_intent_spec_pins_the_tap_contract() {
        val spec = MarketNotifications.alertIntentSpec()

        assertEquals("com.clytrade.app.MainActivity", spec.target.name)
        assertEquals("open_alerts", spec.extraKey)
        assertTrue(spec.extraValue)
        assertEquals(
            Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP,
            spec.flags,
        )
        assertEquals(
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            spec.pendingFlags,
        )
    }

    @Test
    fun notification_spec_pins_id_icon_title_body_count_and_intent() {
        val events = (0 until 7).map { event("S$it", 100.0 + it) }

        val spec = MarketNotifications.notificationSpec(template(), events, "ClyTrade")

        assertEquals(1, spec.id)
        assertEquals("clytrade_alerts", spec.channelId)
        assertEquals(R.drawable.ic_stat_clytrade, spec.smallIcon)
        assertEquals("ClyTrade alerts", spec.title)
        assertEquals(
            "Background hit\nS0 · 100\nS1 · 101\nS2 · 102\nS3 · 103\nS4 · 104\n+2 more",
            spec.body,
        )
        assertEquals(7, spec.number)
        assertTrue(spec.autoCancel)
        assertEquals("com.clytrade.app.MainActivity", spec.intent.target.name)
    }

    @Test
    fun notification_spec_falls_back_to_the_app_name() {
        val spec = MarketNotifications.notificationSpec(template(title = ""), listOf(event("BTC")), "ClyTrade")

        assertEquals("ClyTrade", spec.title)
    }

    @Test
    fun notification_failure_is_caught_and_reported() {
        var reported: Exception? = null

        val shown =
            MarketNotifications.attemptNotification(
                onError = { reported = it },
            ) {
                throw IllegalStateException("boom")
            }

        assertFalse(shown)
        assertEquals("boom", reported?.message)
    }

    @Test
    fun notification_success_returns_true() {
        var reported: Exception? = null

        val shown =
            MarketNotifications.attemptNotification(
                onError = { reported = it },
            ) {}

        assertTrue(shown)
        assertNull(reported)
    }

    @Test
    fun groups_five_items_and_counts_the_rest() {
        val events = (0 until 7).map { event("S$it", 100.0 + it) }

        assertEquals(
            "Background hit\nS0 · 100\nS1 · 101\nS2 · 102\nS3 · 103\nS4 · 104\n+2 more",
            MarketNotifications.buildBody(template(), events),
        )
    }

    @Test
    fun does_not_add_a_more_line_for_five_or_fewer_events() {
        val events = (0 until 5).map { event("S$it", 100.0 + it) }

        assertEquals(
            "Background hit\nS0 · 100\nS1 · 101\nS2 · 102\nS3 · 103\nS4 · 104",
            MarketNotifications.buildBody(template(), events),
        )
    }

    @Test
    fun uses_the_localized_more_template() {
        val events = (0 until 7).map { event("S$it", 100.0 + it) }

        assertEquals(
            "Background hit\nS0 · 100\nS1 · 101\nS2 · 102\nS3 · 103\nS4 · 104\n+2 مورد دیگر",
            MarketNotifications.buildBody(template(more = "+{{count}} مورد دیگر"), events),
        )
    }

    @Test
    fun falls_back_to_english_more_when_the_template_is_missing() {
        val events = (0 until 6).map { event("S$it", 100.0 + it) }

        assertEquals(
            "Background hit\nS0 · 100\nS1 · 101\nS2 · 102\nS3 · 103\nS4 · 104\n+1 more",
            MarketNotifications.buildBody(template(more = ""), events),
        )
    }

    @Test
    fun omits_the_body_prefix_when_the_body_is_blank() {
        val events = listOf(event("BTC", 120.0))

        assertEquals(
            "BTC · 120",
            MarketNotifications.buildBody(template(body = ""), events),
        )
    }

    @Test
    fun falls_back_to_the_event_price_when_the_level_is_missing() {
        val events = listOf(event("BTC", level = null, price = 250.0))

        assertEquals(
            "Background hit\nBTC · 250",
            MarketNotifications.buildBody(template(), events),
        )
    }

    @Test
    fun keeps_latin_digits_and_removes_trailing_zeroes() {
        assertEquals("100", MarketNotifications.formatPrice(100.0))
        assertEquals("101.5", MarketNotifications.formatPrice(101.5))
        assertEquals("0.0000001", MarketNotifications.formatPrice(0.0000001))
    }

    @Test
    fun denied_permission_blocks_posting() {
        assertFalse(MarketNotifications.shouldPost(permissionGranted = false, notificationsEnabled = true))
        assertFalse(MarketNotifications.shouldPost(permissionGranted = true, notificationsEnabled = false))
        assertTrue(MarketNotifications.shouldPost(permissionGranted = true, notificationsEnabled = true))
    }

    @Test
    fun skips_notification_without_events_or_permission() {
        val events = listOf(event("BTC", 120.0))

        assertFalse(MarketNotifications.shouldNotify(emptyList(), allowed = true))
        assertFalse(MarketNotifications.shouldNotify(events, allowed = false))
        assertTrue(MarketNotifications.shouldNotify(events, allowed = true))
    }
}
