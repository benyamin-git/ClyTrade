package com.clytrade.app

import org.json.JSONArray
import org.json.JSONObject
import kotlin.math.abs

data class MarketRef(
    val key: String,
    val symbol: String,
    val binanceSymbol: String?,
    val coingeckoId: String?,
)

data class Event(
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
    val status: String = "unread",
    val resolution: String? = null,
    val readAt: Long? = null,
) {
    fun toJson(): JSONObject =
        JSONObject().apply {
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
            put("status", status)
            put("resolution", resolution ?: JSONObject.NULL)
            put("readAt", readAt ?: JSONObject.NULL)
        }
}

data class Close(
    val tradeId: String = "",
    val level: Double = 0.0,
    val reason: String = "",
    val at: Long = 0L,
    val price: Double = 0.0,
) {
    fun toJson(): JSONObject =
        JSONObject().apply {
            put("tradeId", tradeId)
            put("level", level)
            put("reason", reason)
            put("at", at)
            put("price", price)
        }
}

data class RulePatch(
    val armed: Boolean? = null,
    val lastPrice: Double? = null,
    val lastFiredAt: Long? = null,
    val enabled: Boolean? = null,
    val referencePrice: Double? = null,
) {
    fun isEmpty(): Boolean =
        armed == null &&
            lastPrice == null &&
            lastFiredAt == null &&
            enabled == null &&
            referencePrice == null

    fun toJson(): JSONObject =
        JSONObject().apply {
            if (armed != null) put("armed", armed)
            if (lastPrice != null) put("lastPrice", lastPrice)
            if (lastFiredAt != null) put("lastFiredAt", lastFiredAt)
            if (enabled != null) put("enabled", enabled)
            if (referencePrice != null) put("referencePrice", referencePrice)
        }
}

data class RuleUpdate(
    val id: String = "",
    val patch: RulePatch = RulePatch(),
) {
    fun toJson(): JSONObject =
        JSONObject().apply {
            put("id", id)
            put("patch", patch.toJson())
        }
}

data class EvaluationResult(
    val events: List<Event> = emptyList(),
    val closes: List<Close> = emptyList(),
    val reviews: List<Event> = emptyList(),
    val ruleUpdates: List<RuleUpdate> = emptyList(),
) {
    fun toJson(): JSONObject =
        JSONObject().apply {
            put("events", JSONArray(events.map { it.toJson() }))
            put("closes", JSONArray(closes.map { it.toJson() }))
            put("reviews", JSONArray(reviews.map { it.toJson() }))
            put("ruleUpdates", JSONArray(ruleUpdates.map { it.toJson() }))
        }
}

data class EvaluationInput(
    val now: Long,
    val prices: Map<String, Price>,
    val trades: List<Trade>,
    val rules: List<Rule>,
    val staleMs: Long,
)

private enum class RuleMode {
    Above,
    Below,
    Crossing,
    Range,
    Percent,
}

fun priceKeyFor(binanceSymbol: String?, coingeckoId: String?, symbol: String): String {
    if (!binanceSymbol.isNullOrEmpty()) return "binance:$binanceSymbol"
    if (!coingeckoId.isNullOrEmpty()) return "coingecko:$coingeckoId"
    return "symbol:${symbol.trim().uppercase()}"
}

private fun hasMapping(rule: Rule): Boolean =
    !rule.binanceSymbol.isNullOrEmpty() || !rule.coingeckoId.isNullOrEmpty()

private fun addMarketRef(
    refs: MutableList<MarketRef>,
    index: MutableMap<String, Int>,
    candidate: MarketRef,
) {
    val position = index[candidate.key]
    if (position != null) {
        val existing = refs[position]
        if (existing.binanceSymbol.isNullOrEmpty()) {
            refs[position] = existing.copy(binanceSymbol = candidate.binanceSymbol)
        }
        if (refs[position].coingeckoId.isNullOrEmpty()) {
            refs[position] = refs[position].copy(coingeckoId = candidate.coingeckoId)
        }
        return
    }
    index[candidate.key] = refs.size
    refs.add(candidate)
}

fun marketRefs(snapshot: Snapshot): List<MarketRef> {
    val refs = mutableListOf<MarketRef>()
    val index = mutableMapOf<String, Int>()

    for (trade in snapshot.trades) {
        if (trade.status != "open") continue
        if (trade.targetPrice == null && trade.stopPrice == null) continue
        addMarketRef(
            refs,
            index,
            MarketRef(
                key = priceKeyFor(trade.binanceSymbol, trade.coingeckoId, trade.symbol),
                symbol = trade.symbol,
                binanceSymbol = trade.binanceSymbol,
                coingeckoId = trade.coingeckoId,
            ),
        )
    }

    for (rule in snapshot.rules) {
        if (!rule.enabled) continue
        if (!hasMapping(rule)) continue
        addMarketRef(
            refs,
            index,
            MarketRef(
                key = priceKeyFor(rule.binanceSymbol, rule.coingeckoId, rule.symbol),
                symbol = rule.symbol,
                binanceSymbol = rule.binanceSymbol,
                coingeckoId = rule.coingeckoId,
            ),
        )
    }

    return refs
}

fun providerCandidates(refs: List<MarketRef>, provider: String): List<MarketRef> =
    refs.filter { reference ->
        when (provider) {
            "binance" -> !reference.binanceSymbol.isNullOrEmpty()
            "coingecko" -> !reference.coingeckoId.isNullOrEmpty()
            else -> false
        }
    }

fun uncoveredRefs(refs: List<MarketRef>, covered: Set<String>): List<MarketRef> =
    refs.filter { it.key !in covered }

private fun makeEvent(
    kind: String,
    tradeId: String?,
    ruleId: String?,
    symbol: String,
    price: Double,
    level: Double?,
    targetPrice: Double?,
    stopPrice: Double?,
    at: Long,
    provider: String,
): Event =
    Event(
        kind = kind,
        tradeId = tradeId,
        ruleId = ruleId,
        symbol = symbol,
        price = price,
        level = level,
        targetPrice = targetPrice,
        stopPrice = stopPrice,
        at = at,
        provider = provider,
    )

private fun crossedTarget(trade: Trade, price: Double): Double? {
    val target = trade.targetPrice ?: return null
    val hit = if (trade.direction == "long") price >= target else price <= target
    return if (hit) target else null
}

private fun crossedStop(trade: Trade, price: Double): Double? {
    val stop = trade.stopPrice ?: return null
    val hit = if (trade.direction == "long") price <= stop else price >= stop
    return if (hit) stop else null
}

private fun tradeEvent(
    kind: String,
    trade: Trade,
    price: Price,
    at: Long,
    level: Double?,
): Event =
    makeEvent(
        kind = kind,
        tradeId = trade.id,
        ruleId = null,
        symbol = trade.symbol,
        price = price.price,
        level = if (kind == "stale") null else level,
        targetPrice = trade.targetPrice,
        stopPrice = trade.stopPrice,
        at = at,
        provider = price.provider,
    )

private fun ruleMode(rule: Rule): RuleMode? {
    if (rule.kind == "percent") return RuleMode.Percent
    if (rule.kind != "price") return null
    return when (rule.priceMode) {
        "above" -> RuleMode.Above
        "below" -> RuleMode.Below
        "crossing" -> RuleMode.Crossing
        "range" -> RuleMode.Range
        else -> null
    }
}

private fun isRuleEvaluable(rule: Rule): Boolean {
    val mode = ruleMode(rule) ?: return false
    if (mode == RuleMode.Percent) {
        val percent = rule.percent ?: return false
        val reference = rule.referencePrice ?: return false
        return percent > 0.0 && rule.percentDirection != null && reference != 0.0
    }
    if (mode == RuleMode.Range) {
        return rule.rangeLow != null && rule.rangeHigh != null
    }
    return rule.level != null
}

private fun percentActive(rule: Rule, price: Double): Boolean {
    val reference = rule.referencePrice ?: return false
    val percent = rule.percent ?: return false
    val direction = rule.percentDirection ?: return false
    if (reference == 0.0) return false

    val change = ((price - reference) / reference) * 100.0
    if (direction == "up") return change >= percent
    if (direction == "down") return change <= -percent
    return abs(change) >= percent
}

private fun priceActive(rule: Rule, mode: RuleMode, price: Double): Boolean {
    if (mode == RuleMode.Range) {
        val low = rule.rangeLow ?: return false
        val high = rule.rangeHigh ?: return false
        return price < low || price > high
    }

    val level = rule.level ?: return false
    if (mode == RuleMode.Above) return price >= level
    if (mode == RuleMode.Below) return price <= level
    return false
}

private fun isCrossing(rule: Rule, price: Double): Boolean {
    val level = rule.level ?: return false
    val last = rule.lastPrice ?: return false
    return (last < level && price >= level) || (last > level && price <= level)
}

private fun ruleConditionActive(rule: Rule, price: Double): Boolean {
    val mode = ruleMode(rule) ?: return false
    if (mode == RuleMode.Percent) return percentActive(rule, price)
    if (mode == RuleMode.Crossing) return isCrossing(rule, price)
    return priceActive(rule, mode, price)
}

private data class RuleDecision(
    val fire: Boolean,
    val rearm: Boolean,
)

private fun decideRule(rule: Rule, price: Double): RuleDecision {
    val mode = ruleMode(rule) ?: return RuleDecision(false, false)

    if (mode == RuleMode.Percent) {
        val active = percentActive(rule, price)
        if (rule.repeatMode == "cross-back" && !rule.armed) {
            return RuleDecision(false, !active)
        }
        return RuleDecision(active, false)
    }

    if (mode == RuleMode.Crossing) {
        val crossing = isCrossing(rule, price)
        if (rule.repeatMode == "cross-back" && !rule.armed) {
            return RuleDecision(false, crossing)
        }
        return RuleDecision(crossing, false)
    }

    val active = priceActive(rule, mode, price)
    if (rule.repeatMode == "cross-back" && !rule.armed) {
        return RuleDecision(false, !active)
    }
    return RuleDecision(active, false)
}

private fun cooldownElapsed(rule: Rule, now: Long): Boolean {
    if (rule.repeatMode != "cooldown") return true
    val lastFiredAt = rule.lastFiredAt ?: return true
    return now - lastFiredAt >= rule.cooldownMinutes * 60_000L
}

private fun ruleEventLevel(rule: Rule): Double? {
    if (rule.kind != "price") return null
    if (rule.priceMode == "range") return null
    return rule.level
}

private fun ruleEvent(
    kind: String,
    rule: Rule,
    price: Price,
    at: Long,
): Event =
    makeEvent(
        kind = kind,
        tradeId = null,
        ruleId = rule.id,
        symbol = rule.symbol,
        price = price.price,
        level = if (kind == "stale") null else ruleEventLevel(rule),
        targetPrice = null,
        stopPrice = null,
        at = at,
        provider = price.provider,
    )

fun evaluatePrices(input: EvaluationInput): EvaluationResult {
    val events = mutableListOf<Event>()
    val closes = mutableListOf<Close>()
    val reviews = mutableListOf<Event>()
    val ruleUpdates = mutableListOf<RuleUpdate>()

    for (trade in input.trades) {
        if (trade.status != "open") continue

        val key = priceKeyFor(trade.binanceSymbol, trade.coingeckoId, trade.symbol)
        val price = input.prices[key] ?: continue

        val target = crossedTarget(trade, price.price)
        val stop = crossedStop(trade, price.price)
        if (target == null && stop == null) continue

        val fresh = input.now - price.fetchedAt < input.staleMs

        if (!fresh) {
            reviews.add(tradeEvent("stale", trade, price, input.now, null))
            continue
        }

        if (target != null && stop != null) {
            reviews.add(tradeEvent("gap", trade, price, input.now, null))
            continue
        }

        val reason = if (target != null) "target" else "stop"
        val level = target ?: stop ?: continue

        events.add(tradeEvent(reason, trade, price, input.now, level))
        if (trade.autoClose) {
            closes.add(
                Close(
                    tradeId = trade.id,
                    level = level,
                    reason = reason,
                    at = input.now,
                    price = price.price,
                ),
            )
        }
    }

    for (rule in input.rules) {
        if (!rule.enabled) continue
        if (!hasMapping(rule)) continue
        if (!isRuleEvaluable(rule)) continue

        val key = priceKeyFor(rule.binanceSymbol, rule.coingeckoId, rule.symbol)
        val price = input.prices[key] ?: continue

        val fresh = input.now - price.fetchedAt < input.staleMs

        if (!fresh) {
            if (ruleConditionActive(rule, price.price)) {
                reviews.add(ruleEvent("stale", rule, price, input.now))
            }
            continue
        }

        val decision = decideRule(rule, price.price)
        val fire = decision.fire && cooldownElapsed(rule, input.now)
        var patch = RulePatch()

        if (rule.lastPrice != price.price) {
            patch = patch.copy(lastPrice = price.price)
        }

        if (fire) {
            patch = patch.copy(lastFiredAt = input.now)
            if (rule.kind == "percent") {
                patch = patch.copy(referencePrice = price.price)
            }
            if (rule.repeatMode == "once") {
                patch = patch.copy(enabled = false)
            }
            if (rule.repeatMode == "cross-back" && rule.armed) {
                patch = patch.copy(armed = false)
            }
            events.add(
                ruleEvent(
                    if (rule.kind == "percent") "percent" else "level",
                    rule,
                    price,
                    input.now,
                ),
            )
        } else if (decision.rearm && !rule.armed) {
            patch = patch.copy(armed = true)
        }

        if (!patch.isEmpty()) {
            ruleUpdates.add(RuleUpdate(id = rule.id, patch = patch))
        }
    }

    return EvaluationResult(
        events = events,
        closes = closes,
        reviews = reviews,
        ruleUpdates = ruleUpdates,
    )
}

internal data class CachedRuleState(
    val updatedAt: Long,
    var lastPrice: Double?,
    var armed: Boolean,
    var lastFiredAt: Long?,
    var referencePrice: Double?,
    var enabled: Boolean,
) {
    companion object {
        fun fromRule(rule: Rule): CachedRuleState =
            CachedRuleState(
                updatedAt = rule.updatedAt,
                lastPrice = rule.lastPrice,
                armed = rule.armed,
                lastFiredAt = rule.lastFiredAt,
                referencePrice = rule.referencePrice,
                enabled = rule.enabled,
            )
    }
}

class RuleStateCache {
    internal val states: MutableMap<String, CachedRuleState> = mutableMapOf()

    fun clear() {
        states.clear()
    }

    fun isEmpty(): Boolean = states.isEmpty()
}

fun seedRuleCacheFromQueue(
    cache: RuleStateCache,
    snapshot: Snapshot,
    existingJson: String,
) {
    for (event in MarketQueue.parseEvents(existingJson)) {
        val ruleId = event.ruleId ?: continue
        val state = event.ruleState ?: continue
        val rule = snapshot.rules.firstOrNull { it.id == ruleId } ?: continue
        if (event.at < rule.updatedAt) continue
        val existing = cache.states[ruleId]
        if (existing != null &&
            existing.updatedAt == rule.updatedAt &&
            (existing.lastFiredAt ?: Long.MIN_VALUE) > event.at
        ) {
            continue
        }
        cache.states[ruleId] =
            CachedRuleState(
                updatedAt = rule.updatedAt,
                lastPrice = state.lastPrice,
                armed = state.armed,
                lastFiredAt = state.lastFiredAt,
                referencePrice = state.referencePrice,
                enabled = state.enabled,
            )
    }
}

private fun overlayRules(snapshot: Snapshot, cache: RuleStateCache): List<Rule> =
    snapshot.rules.map { rule ->
        val state = cache.states[rule.id]
        if (state != null && state.updatedAt == rule.updatedAt) {
            rule.copy(
                lastPrice = state.lastPrice,
                armed = state.armed,
                lastFiredAt = state.lastFiredAt,
                referencePrice = state.referencePrice,
                enabled = state.enabled,
            )
        } else {
            rule
        }
    }

private fun applyRuleUpdates(
    cache: RuleStateCache,
    rules: List<Rule>,
    updates: List<RuleUpdate>,
) {
    for (update in updates) {
        val rule = rules.firstOrNull { it.id == update.id } ?: continue
        val state = CachedRuleState.fromRule(rule)
        update.patch.armed?.let { state.armed = it }
        update.patch.lastPrice?.let { state.lastPrice = it }
        update.patch.lastFiredAt?.let { state.lastFiredAt = it }
        update.patch.enabled?.let { state.enabled = it }
        update.patch.referencePrice?.let { state.referencePrice = it }
        cache.states[rule.id] = state
    }
}

private fun formatPrice(value: Double): String {
    if (value.isFinite() && value == Math.floor(value) && abs(value) < 1e15) {
        return value.toLong().toString()
    }
    return value.toString()
}

private fun eventId(event: Event): String {
    val target =
        when {
            event.ruleId != null -> "rule:${event.ruleId}"
            event.tradeId != null -> "trade:${event.tradeId}"
            else -> event.symbol
        }
    val level = event.level?.let(::formatPrice) ?: "none"
    return "bg:${event.at}:${event.kind}:$target:$level"
}

private fun eventDirection(event: Event, trades: List<Trade>): String {
    val tradeId = event.tradeId ?: return "long"
    val trade = trades.firstOrNull { it.id == tradeId } ?: return "long"
    return trade.direction
}

private fun ruleStateAfter(rule: Rule, update: RuleUpdate?): RuleState {
    var armed = rule.armed
    var lastPrice = rule.lastPrice
    var lastFiredAt = rule.lastFiredAt
    var referencePrice = rule.referencePrice
    var enabled = rule.enabled
    if (update != null) {
        update.patch.armed?.let { armed = it }
        update.patch.lastPrice?.let { lastPrice = it }
        update.patch.lastFiredAt?.let { lastFiredAt = it }
        update.patch.referencePrice?.let { referencePrice = it }
        update.patch.enabled?.let { enabled = it }
    }
    return RuleState(
        armed = armed,
        lastPrice = lastPrice,
        lastFiredAt = lastFiredAt,
        referencePrice = referencePrice,
        enabled = enabled,
    )
}

private fun queueEvent(
    event: Event,
    trades: List<Trade>,
    rules: List<Rule>,
    updates: List<RuleUpdate>,
): QueueEvent {
    val ruleState =
        event.ruleId?.let { ruleId ->
            if (event.kind == "stale") return@let null
            val rule = rules.firstOrNull { it.id == ruleId } ?: return@let null
            val update = updates.firstOrNull { it.id == ruleId }
            ruleStateAfter(rule, update)
        }
    return QueueEvent(
        id = eventId(event),
        kind = event.kind,
        tradeId = event.tradeId,
        ruleId = event.ruleId,
        symbol = event.symbol,
        price = event.price,
        level = event.level,
        targetPrice = event.targetPrice,
        stopPrice = event.stopPrice,
        at = event.at,
        provider = event.provider,
        direction = eventDirection(event, trades),
        ruleState = ruleState,
    )
}

data class SnapshotRun(
    val prices: Int,
    val events: List<Event>,
    val reviews: List<Event>,
    val queued: List<QueueEvent>,
    val queueJson: String,
    val ruleUpdates: List<RuleUpdate>,
)

fun runSnapshot(
    snapshot: Snapshot,
    prices: Map<String, Price>,
    existingQueue: String,
    now: Long,
    cache: RuleStateCache,
): SnapshotRun {
    val rules = overlayRules(snapshot, cache)
    val result =
        evaluatePrices(
            EvaluationInput(
                now = now,
                prices = prices,
                trades = snapshot.trades,
                rules = rules,
                staleMs = snapshot.staleMs,
            ),
        )
    applyRuleUpdates(cache, rules, result.ruleUpdates)

    val candidates =
        (result.events + result.reviews).map { event ->
            queueEvent(event, snapshot.trades, rules, result.ruleUpdates)
        }
    val appended = MarketQueue.appendEvents(existingQueue, candidates, rules)

    return SnapshotRun(
        prices = prices.size,
        events = result.events,
        reviews = result.reviews,
        queued = appended.retained,
        queueJson = appended.json,
        ruleUpdates = result.ruleUpdates,
    )
}
