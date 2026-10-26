package com.clytrade.app

import android.content.Context
import org.json.JSONException
import org.json.JSONObject
import java.io.File
import java.io.IOException

object MarketRuleStateStore {
    const val STATE_FILE = "background-rule-state.json"
    private const val VERSION = 1

    fun path(context: Context): File = File(context.filesDir, STATE_FILE)

    fun seed(
        context: Context,
        snapshot: Snapshot,
        cache: RuleStateCache,
        existingQueue: String,
    ) {
        seed(path(context), snapshot, cache, existingQueue)
    }

    fun seed(
        file: File,
        snapshot: Snapshot,
        cache: RuleStateCache,
        existingQueue: String,
    ) {
        val savedAt = read(file, snapshot, cache)
        seedRuleCacheFromQueue(cache, snapshot, existingQueue, savedAt)
    }

    fun read(
        file: File,
        snapshot: Snapshot,
        cache: RuleStateCache,
    ): Map<String, Long> {
        if (!file.exists()) return emptyMap()
        val raw =
            try {
                file.readText()
            } catch (_: IOException) {
                return emptyMap()
            }
        val root =
            try {
                JSONObject(raw)
            } catch (_: JSONException) {
                return emptyMap()
            }
        val savedAt =
            try {
                root.longValue("savedAt", 0L)
            } catch (_: JSONException) {
                0L
            }
        val rules =
            try {
                root.objectField("rules")
            } catch (_: JSONException) {
                null
            } ?: return emptyMap()

        val applied = mutableMapOf<String, Long>()
        for (ruleId in rules.keys()) {
            val entry =
                try {
                    rules.objectField(ruleId)
                } catch (_: JSONException) {
                    null
                } ?: continue
            val rule = snapshot.rules.firstOrNull { it.id == ruleId } ?: continue
            val updatedAt =
                try {
                    entry.longField("updatedAt")
                } catch (_: JSONException) {
                    null
                } ?: continue
            if (updatedAt != rule.updatedAt) continue
            val state =
                try {
                    CachedRuleState(
                        updatedAt = updatedAt,
                        lastPrice = entry.numberField("lastPrice"),
                        armed = entry.booleanField("armed"),
                        lastFiredAt = entry.longField("lastFiredAt"),
                        referencePrice = entry.numberField("referencePrice"),
                        enabled = entry.booleanField("enabled"),
                    )
                } catch (_: JSONException) {
                    continue
                }
            cache.states[ruleId] = state
            applied[ruleId] = savedAt
        }
        return applied
    }

    fun write(
        context: Context,
        snapshot: Snapshot,
        cache: RuleStateCache,
        savedAt: Long,
    ): Boolean = write(path(context), snapshot, cache, savedAt)

    fun write(
        file: File,
        snapshot: Snapshot,
        cache: RuleStateCache,
        savedAt: Long,
    ): Boolean {
        val rules = JSONObject()
        for ((ruleId, state) in cache.states) {
            val rule = snapshot.rules.firstOrNull { it.id == ruleId } ?: continue
            if (state.updatedAt != rule.updatedAt) continue
            rules.put(
                ruleId,
                JSONObject().apply {
                    put("updatedAt", state.updatedAt)
                    put("armed", state.armed)
                    put("lastPrice", state.lastPrice ?: JSONObject.NULL)
                    put("lastFiredAt", state.lastFiredAt ?: JSONObject.NULL)
                    put("referencePrice", state.referencePrice ?: JSONObject.NULL)
                    put("enabled", state.enabled)
                },
            )
        }
        val root =
            JSONObject().apply {
                put("version", VERSION)
                put("savedAt", savedAt)
                put("rules", rules)
            }
        return writeAtomicFile(file, root.toString())
    }
}
