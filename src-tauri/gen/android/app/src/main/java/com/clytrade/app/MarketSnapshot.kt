package com.clytrade.app

import android.content.Context
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject
import java.io.File
import java.io.IOException

const val DEFAULT_STALE_MS = 15L * 60_000L

internal fun JSONObject.stringField(name: String, fallback: String = ""): String {
    if (!has(name) || isNull(name)) return fallback
    return get(name) as? String ?: throw JSONException("$name must be a string")
}

internal fun JSONObject.nullableString(name: String): String? {
    if (!has(name) || isNull(name)) return null
    return get(name) as? String ?: throw JSONException("$name must be a string")
}

internal fun JSONObject.numberField(name: String): Double? {
    if (!has(name) || isNull(name)) return null
    return (get(name) as? Number)?.toDouble() ?: throw JSONException("$name must be a number")
}

internal fun JSONObject.doubleField(name: String, fallback: Double = 0.0): Double =
    numberField(name) ?: fallback

internal fun JSONObject.longField(name: String): Long? {
    if (!has(name) || isNull(name)) return null
    return (get(name) as? Number)?.toLong() ?: throw JSONException("$name must be a number")
}

internal fun JSONObject.longValue(name: String, fallback: Long = 0L): Long =
    longField(name) ?: fallback

internal fun JSONObject.booleanField(name: String, fallback: Boolean = false): Boolean {
    if (!has(name) || isNull(name)) return fallback
    return get(name) as? Boolean ?: throw JSONException("$name must be a boolean")
}

internal fun JSONObject.objectField(name: String): JSONObject? {
    if (!has(name) || isNull(name)) return null
    return get(name) as? JSONObject ?: throw JSONException("$name must be an object")
}

internal fun JSONObject.objectArray(name: String): List<JSONObject> {
    if (!has(name) || isNull(name)) return emptyList()
    val array = get(name) as? JSONArray ?: throw JSONException("$name must be an array")
    return (0 until array.length()).map { index ->
        array.get(index) as? JSONObject ?: throw JSONException("$name[$index] must be an object")
    }
}

internal fun writeAtomicFile(file: File, text: String): Boolean {
    var temp: File? = null
    return try {
        val parent = file.parentFile
        if (parent != null) parent.mkdirs()
        val tempFile = File(parent, ".${file.name}.${System.nanoTime()}.tmp")
        temp = tempFile
        tempFile.writeText(text)
        if (tempFile.renameTo(file)) {
            true
        } else {
            file.delete()
            val renamed = tempFile.renameTo(file)
            if (!renamed) tempFile.delete()
            renamed
        }
    } catch (_: IOException) {
        temp?.delete()
        false
    }
}

data class NotificationTemplate(
    val title: String = "",
    val body: String = "",
) {
    companion object {
        fun fromJson(json: JSONObject): NotificationTemplate =
            NotificationTemplate(
                title = json.stringField("title"),
                body = json.stringField("body"),
            )
    }
}

data class Trade(
    val id: String = "",
    val symbol: String = "",
    val direction: String = "long",
    val status: String = "open",
    val targetPrice: Double? = null,
    val stopPrice: Double? = null,
    val autoClose: Boolean = false,
    val binanceSymbol: String? = null,
    val coingeckoId: String? = null,
    val updatedAt: Long = 0L,
    val priceKey: String = "",
) {
    companion object {
        fun fromJson(json: JSONObject): Trade =
            Trade(
                id = json.stringField("id"),
                symbol = json.stringField("symbol"),
                direction = json.stringField("direction", "long"),
                status = json.stringField("status", "open"),
                targetPrice = json.numberField("targetPrice"),
                stopPrice = json.numberField("stopPrice"),
                autoClose = json.booleanField("autoClose"),
                binanceSymbol = json.nullableString("binanceSymbol"),
                coingeckoId = json.nullableString("coingeckoId"),
                updatedAt = json.longValue("updatedAt"),
                priceKey = json.stringField("priceKey"),
            )
    }
}

data class Rule(
    val id: String = "",
    val symbol: String = "",
    val kind: String = "price",
    val priceMode: String? = null,
    val level: Double? = null,
    val rangeLow: Double? = null,
    val rangeHigh: Double? = null,
    val percent: Double? = null,
    val percentDirection: String? = null,
    val repeatMode: String = "once",
    val cooldownMinutes: Long = 60L,
    val referencePrice: Double? = null,
    val lastPrice: Double? = null,
    val armed: Boolean = false,
    val enabled: Boolean = true,
    val lastFiredAt: Long? = null,
    val binanceSymbol: String? = null,
    val coingeckoId: String? = null,
    val updatedAt: Long = 0L,
    val priceKey: String = "",
) {
    companion object {
        fun fromJson(json: JSONObject): Rule =
            Rule(
                id = json.stringField("id"),
                symbol = json.stringField("symbol"),
                kind = json.stringField("kind", "price"),
                priceMode = json.nullableString("priceMode"),
                level = json.numberField("level"),
                rangeLow = json.numberField("rangeLow"),
                rangeHigh = json.numberField("rangeHigh"),
                percent = json.numberField("percent"),
                percentDirection = json.nullableString("percentDirection"),
                repeatMode = json.stringField("repeat", "once"),
                cooldownMinutes = json.longValue("cooldownMinutes", 60L),
                referencePrice = json.numberField("referencePrice"),
                lastPrice = json.numberField("lastPrice"),
                armed = json.booleanField("armed"),
                enabled = json.booleanField("enabled", true),
                lastFiredAt = json.longField("lastFiredAt"),
                binanceSymbol = json.nullableString("binanceSymbol"),
                coingeckoId = json.nullableString("coingeckoId"),
                updatedAt = json.longValue("updatedAt"),
                priceKey = json.stringField("priceKey"),
            )
    }
}

data class Price(
    val key: String = "",
    val symbol: String = "",
    val provider: String = "",
    val price: Double = 0.0,
    val fetchedAt: Long = 0L,
    val sourceTimestamp: Long? = null,
) {
    companion object {
        fun fromJson(json: JSONObject): Price =
            Price(
                key = json.stringField("key"),
                symbol = json.stringField("symbol"),
                provider = json.stringField("provider"),
                price = json.doubleField("price"),
                fetchedAt = json.longValue("fetchedAt"),
                sourceTimestamp = json.longField("sourceTimestamp"),
            )
    }
}

data class Snapshot(
    val version: Int = 1,
    val generatedAt: Long = 0L,
    val locale: String = "en",
    val provider: String = "auto",
    val coingeckoKey: String? = null,
    val backgroundMonitoring: Boolean = false,
    val windowsCloseBehavior: String = "unset",
    val staleMs: Long = DEFAULT_STALE_MS,
    val notification: NotificationTemplate = NotificationTemplate(),
    val trades: List<Trade> = emptyList(),
    val rules: List<Rule> = emptyList(),
) {
    companion object {
        fun parse(raw: String): Snapshot? =
            try {
                fromJson(JSONObject(raw))
            } catch (_: JSONException) {
                null
            }

        fun fromJson(json: JSONObject): Snapshot =
            Snapshot(
                version = json.longValue("version", 1L).toInt(),
                generatedAt = json.longValue("generatedAt"),
                locale = json.stringField("locale", "en"),
                provider = json.stringField("provider", "auto"),
                coingeckoKey = json.nullableString("coingeckoKey"),
                backgroundMonitoring = json.booleanField("backgroundMonitoring"),
                windowsCloseBehavior = json.stringField("windowsCloseBehavior", "unset"),
                staleMs = json.longValue("staleMs", DEFAULT_STALE_MS),
                notification = json.objectField("notification")?.let(NotificationTemplate::fromJson)
                    ?: NotificationTemplate(),
                trades = json.objectArray("trades").map(Trade::fromJson),
                rules = json.objectArray("rules").map(Rule::fromJson),
            )
    }
}

object MarketSnapshotStore {
    const val SNAPSHOT_FILE = "background-snapshot.json"

    fun path(context: Context): File = File(context.filesDir, SNAPSHOT_FILE)

    fun read(context: Context): Snapshot? = read(path(context))

    fun read(file: File): Snapshot? {
        if (!file.exists()) return null
        val raw =
            try {
                file.readText()
            } catch (_: IOException) {
                return null
            }
        return Snapshot.parse(raw)
    }

    fun write(context: Context, json: String): Boolean = write(path(context), json)

    fun write(file: File, json: String): Boolean {
        return try {
            JSONObject(json)
            writeAtomicFile(file, json)
        } catch (_: JSONException) {
            false
        }
    }
}
