package com.clytrade.app

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import java.math.BigDecimal

internal data class ChannelSpec(
    val id: String,
    val name: String,
    val importance: Int,
    val description: String,
)

internal data class AlertIntentSpec(
    val target: Class<*>,
    val extraKey: String,
    val extraValue: Boolean,
    val flags: Int,
    val pendingFlags: Int,
)

internal data class NotificationSpec(
    val id: Int,
    val channelId: String,
    val smallIcon: Int,
    val title: String,
    val body: String,
    val number: Int,
    val autoCancel: Boolean,
    val intent: AlertIntentSpec,
)

object MarketNotifications {
    const val CHANNEL_ID = "clytrade_alerts"
    const val NOTIFICATION_ID = 1
    const val EXTRA_OPEN_ALERTS = "open_alerts"
    const val ALERTS_ROUTE = "/alerts/overview"
    const val MAX_ITEMS = 5
    private const val TAG = "MarketNotifications"

    internal val SMALL_ICON = R.drawable.ic_stat_clytrade
    internal val ALERT_INTENT_FLAGS =
        Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
    internal val PENDING_INTENT_FLAGS =
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE

    fun show(
        context: Context,
        snapshot: Snapshot,
        events: List<QueueEvent>,
    ): Boolean {
        if (!shouldNotify(events, canPost(context))) return false
        val manager = context.getSystemService(NotificationManager::class.java) ?: return false
        val template = snapshot.notification
        val appName = context.getString(R.string.app_name)
        val channel = channelSpec(template, appName)
        val spec = notificationSpec(template, events, appName)
        return attemptNotification(
            onError = { error -> Log.w(TAG, "background notification failed", error) },
        ) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                manager.createNotificationChannel(
                    NotificationChannel(channel.id, channel.name, channel.importance).apply {
                        description = channel.description
                    },
                )
            }
            val notification =
                NotificationCompat.Builder(context, spec.channelId)
                    .setSmallIcon(spec.smallIcon)
                    .setContentTitle(spec.title)
                    .setContentText(spec.body.lineSequence().firstOrNull().orEmpty())
                    .setStyle(NotificationCompat.BigTextStyle().bigText(spec.body))
                    .setContentIntent(alertsIntent(context, spec.intent))
                    .setAutoCancel(spec.autoCancel)
                    .setNumber(spec.number)
                    .build()
            manager.notify(spec.id, notification)
        }
    }

    internal fun channelSpec(
        template: NotificationTemplate,
        appName: String,
    ): ChannelSpec =
        ChannelSpec(
            id = CHANNEL_ID,
            name = template.title.ifBlank { appName },
            importance = NotificationManager.IMPORTANCE_DEFAULT,
            description = template.body,
        )

    internal fun alertIntentSpec(): AlertIntentSpec =
        AlertIntentSpec(
            target = MainActivity::class.java,
            extraKey = EXTRA_OPEN_ALERTS,
            extraValue = true,
            flags = ALERT_INTENT_FLAGS,
            pendingFlags = PENDING_INTENT_FLAGS,
        )

    internal fun notificationSpec(
        template: NotificationTemplate,
        events: List<QueueEvent>,
        appName: String,
    ): NotificationSpec =
        NotificationSpec(
            id = NOTIFICATION_ID,
            channelId = CHANNEL_ID,
            smallIcon = SMALL_ICON,
            title = template.title.ifBlank { appName },
            body = buildBody(template, events),
            number = events.size,
            autoCancel = true,
            intent = alertIntentSpec(),
        )

    internal fun attemptNotification(
        onError: (Exception) -> Unit,
        block: () -> Unit,
    ): Boolean =
        try {
            block()
            true
        } catch (error: Exception) {
            onError(error)
            false
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

    private fun alertsIntent(
        context: Context,
        spec: AlertIntentSpec,
    ): PendingIntent {
        val intent =
            Intent(context, spec.target).apply {
                putExtra(spec.extraKey, spec.extraValue)
                flags = spec.flags
            }
        return PendingIntent.getActivity(
            context,
            0,
            intent,
            spec.pendingFlags,
        )
    }
}
