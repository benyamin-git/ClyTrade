package com.clytrade.app

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import java.math.BigDecimal

object MarketNotifications {
    const val CHANNEL_ID = "clytrade_alerts"
    const val NOTIFICATION_ID = 1
    const val EXTRA_OPEN_ALERTS = "open_alerts"
    const val ALERTS_ROUTE = "/alerts/overview"
    const val MAX_ITEMS = 5

    fun show(
        context: Context,
        snapshot: Snapshot,
        events: List<QueueEvent>,
    ): Boolean {
        if (!shouldNotify(events, canPost(context))) return false
        val manager = context.getSystemService(NotificationManager::class.java) ?: return false
        val template = snapshot.notification
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            manager.createNotificationChannel(
                NotificationChannel(
                    CHANNEL_ID,
                    template.title.ifBlank { context.getString(R.string.app_name) },
                    NotificationManager.IMPORTANCE_DEFAULT,
                ).apply {
                    description = template.body
                },
            )
        }
        val body = buildBody(template, events)
        val notification =
            NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_stat_clytrade)
                .setContentTitle(template.title.ifBlank { context.getString(R.string.app_name) })
                .setContentText(body.lineSequence().firstOrNull().orEmpty())
                .setStyle(NotificationCompat.BigTextStyle().bigText(body))
                .setContentIntent(alertsIntent(context))
                .setAutoCancel(true)
                .setNumber(events.size)
                .build()
        return try {
            manager.notify(NOTIFICATION_ID, notification)
            true
        } catch (_: SecurityException) {
            false
        }
    }

    internal fun buildBody(
        template: NotificationTemplate,
        events: List<QueueEvent>,
    ): String {
        if (events.isEmpty()) return template.body
        val items =
            events
                .take(MAX_ITEMS)
                .map { event -> "${event.symbol} · ${formatPrice(event.level ?: event.price)}" }
                .toMutableList()
        val remaining = events.size - MAX_ITEMS
        if (remaining > 0) items.add(moreLine(template, remaining))
        val lines = items.joinToString("\n")
        return if (template.body.isBlank()) lines else "${template.body}\n$lines"
    }

    internal fun moreLine(
        template: NotificationTemplate,
        remaining: Int,
    ): String {
        val pattern = template.more.ifBlank { "+{{count}} more" }
        return pattern.replace("{{count}}", remaining.toString())
    }

    internal fun formatPrice(value: Double): String {
        if (!value.isFinite()) return value.toString()
        return BigDecimal.valueOf(value).stripTrailingZeros().toPlainString()
    }

    internal fun shouldPost(
        permissionGranted: Boolean,
        notificationsEnabled: Boolean,
    ): Boolean = permissionGranted && notificationsEnabled

    internal fun shouldNotify(
        events: List<QueueEvent>,
        allowed: Boolean,
    ): Boolean = events.isNotEmpty() && allowed

    private fun canPost(context: Context): Boolean {
        val permissionGranted =
            Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
                context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) ==
                PackageManager.PERMISSION_GRANTED
        val manager = context.getSystemService(NotificationManager::class.java)
        return shouldPost(permissionGranted, manager?.areNotificationsEnabled() == true)
    }

    private fun alertsIntent(context: Context): PendingIntent {
        val intent =
            Intent(context, MainActivity::class.java).apply {
                putExtra(EXTRA_OPEN_ALERTS, true)
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
        return PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }
}
