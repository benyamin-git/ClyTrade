package com.clytrade.app

import android.content.Context
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject
import java.io.File
import java.io.IOException
import kotlin.math.abs

const val QUEUE_CAP = 200

data class RuleState(
    val armed: Boolean = false,
    val lastPrice: Double? = null,
    val lastFiredAt: Long? = null,
    val referencePrice: Double? = null,
    val enabled: Boolean = false,
) {
    fun toJson(): JSONObject =
        JSONObject().apply {
            put("armed", armed)
            put("lastPrice", lastPrice ?: JSONObject.NULL)
            put("lastFiredAt", lastFiredAt ?: JSONObject.NULL)
            put("referencePrice", referencePrice ?: JSONObject.NULL)
            put("enabled", enabled)
        }

    companion object {
        fun fromJson(json: JSONObject): RuleState =
            RuleState(
                armed = json.booleanField("armed"),
                lastPrice = json.numberField("lastPrice"),
                lastFiredAt = json.longField("lastFiredAt"),
                referencePrice = json.numberField("referencePrice"),
                enabled = json.booleanField("enabled"),
            )
    }
}

data class QueueEvent(
    val id: String = "",
    val kind: String = "",
    val tradeId: String? = null,
    val ruleId: String? = null,
    val symbol: String = "",
    val price: Double = 0.0,
    val level: Double? = null,
    val targetPrice: Double? = null,
    val stopPrice: Double? = null,
    val at: Long = 0L,
    val provider: String = "",
    val direction: String = "long",
    val ruleState: RuleState? = null,
) {
    fun toJson(): JSONObject =
        JSONObject().apply {
            put("id", id)
            put("kind", kind)
            put("tradeId", tradeId ?: JSONObject.NULL)
            put("ruleId", ruleId ?: JSONObject.NULL)
            put("symbol", symbol)
            put("price", price)
            put("level", level ?: JSONObject.NULL)
            put("targetPrice", targetPrice ?: JSONObject.NULL)
            put("stopPrice", stopPrice ?: JSONObject.NULL)
            put("at", at)
            put("provider", provider)
            put("direction", direction)
            if (ruleState != null) put("ruleState", ruleState.toJson())
        }

    companion object {
        fun fromJson(json: JSONObject): QueueEvent =
            QueueEvent(
                id = json.stringField("id"),
                kind = json.stringField("kind"),
                tradeId = json.nullableString("tradeId"),
                ruleId = json.nullableString("ruleId"),
                symbol = json.stringField("symbol"),
                price = json.doubleField("price"),
                level = json.numberField("level"),
                targetPrice = json.numberField("targetPrice"),
                stopPrice = json.numberField("stopPrice"),
                at = json.longValue("at"),
                provider = json.stringField("provider"),
                direction = json.stringField("direction", "long"),
                ruleState = json.objectField("ruleState")?.let(RuleState::fromJson),
            )
    }
}

data class AppendResult(
    val json: String,
    val retained: List<QueueEvent>,
)

object MarketQueue {
    const val EVENTS_FILE = "background-events.json"

    fun path(context: Context): File = File(context.filesDir, EVENTS_FILE)

    fun read(context: Context): String = read(path(context))

    fun read(file: File): String {
        if (!file.exists()) return "[]"
        val raw =
            try {
                file.readText()
            } catch (_: IOException) {
                return "[]"
            }
        return try {
            JSONArray(raw)
            raw
        } catch (_: JSONException) {
            "[]"
        }
    }

    fun write(context: Context, json: String): Boolean = writeAtomicFile(path(context), json)

    fun clear(context: Context) {
        path(context).delete()
    }

    fun parseEvents(raw: String): List<QueueEvent> {
        val rows =
            try {
                JSONArray(raw)
            } catch (_: JSONException) {
                return emptyList()
            }
        val events = mutableListOf<QueueEvent>()
        for (index in 0 until rows.length()) {
            val row = rows.opt(index) as? JSONObject ?: continue
            try {
                events.add(QueueEvent.fromJson(row))
            } catch (_: JSONException) {
                continue
            }
        }
        return events
    }

    fun appendEvents(
        existingJson: String,
        candidates: List<QueueEvent>,
        rules: List<Rule>,
    ): AppendResult {
        val existing = parseEvents(existingJson).toMutableList()
        val rulesById = rules.associateBy { it.id }
        val accepted = mutableListOf<QueueEvent>()

        for (candidate in candidates) {
            if (isDuplicate(existing, accepted, candidate, rulesById)) continue
            accepted.add(candidate)
        }

        existing.addAll(accepted)
        while (existing.size > QUEUE_CAP) {
            existing.removeAt(0)
        }

        val retained = accepted.filter { existing.contains(it) }
        val array = JSONArray()
        existing.forEach { array.put(it.toJson()) }
        return AppendResult(array.toString(), retained)
    }

    private fun isDuplicate(
        existing: List<QueueEvent>,
        accepted: List<QueueEvent>,
        candidate: QueueEvent,
        rules: Map<String, Rule>,
    ): Boolean {
        val ruleId = candidate.ruleId
        if (ruleId != null) {
            val rule = rules[ruleId] ?: return false
            if (rule.repeatMode != "cooldown") return false
            val window = (rule.cooldownMinutes * 60_000L).coerceAtLeast(0L)
            return (existing.asSequence() + accepted.asSequence()).any { event ->
                event.ruleId == ruleId &&
                    event.level == candidate.level &&
                    abs(candidate.at - event.at) < window
            }
        }

        val tradeId = candidate.tradeId ?: return false
        return (existing.asSequence() + accepted.asSequence()).any { event ->
            event.tradeId == tradeId &&
                event.kind == candidate.kind &&
                event.level == candidate.level
        }
    }
}
