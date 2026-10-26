package com.clytrade.app

import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.TimeUnit

data class FetchOutcome(
    val prices: Map<String, Price>,
    val transientFailure: Boolean,
)

class MarketApi(
    private val client: OkHttpClient = defaultClient(),
) {
    fun fetchPrices(
        snapshot: Snapshot,
        refs: List<MarketRef>,
        now: Long,
    ): FetchOutcome {
        val choice = snapshot.provider
        val prices = linkedMapOf<String, Price>()
        val covered = mutableSetOf<String>()
        var transientFailure = false

        if (choice != "coingecko") {
            val candidates = providerCandidates(refs, "binance")
            if (candidates.isNotEmpty()) {
                when (val result = fetchBinance(candidates, now)) {
                    is FetchResult.Success -> {
                        result.prices.forEach { price ->
                            prices[price.key] = price
                            covered.add(price.key)
                        }
                    }
                    is FetchResult.Failure -> {
                        if (result.transient) transientFailure = true
                    }
                }
            }
        }

        if (choice != "binance") {
            val scoped = if (choice == "auto") uncoveredRefs(refs, covered) else refs
            val candidates = providerCandidates(scoped, "coingecko")
            if (candidates.isNotEmpty()) {
                when (val result = fetchCoinGecko(candidates, snapshot.coingeckoKey, now)) {
                    is FetchResult.Success -> {
                        result.prices.forEach { price -> prices[price.key] = price }
                    }
                    is FetchResult.Failure -> {
                        if (result.transient) transientFailure = true
                    }
                }
            }
        }

        return FetchOutcome(prices, transientFailure)
    }

    private fun fetchBinance(refs: List<MarketRef>, now: Long): FetchResult {
        val symbols =
            refs.mapNotNull { reference ->
                reference.binanceSymbol?.takeIf { it.isNotEmpty() }
            }
        if (symbols.isEmpty()) return FetchResult.Success(emptyList())

        val url =
            BINANCE_URL
                .toHttpUrl()
                .newBuilder()
                .addQueryParameter("symbols", JSONArray(symbols).toString())
                .build()
        val request = Request.Builder().url(url).build()
        return execute(request) { payload -> parseBinancePrices(payload, refs, now) }
    }

    private fun fetchCoinGecko(
        refs: List<MarketRef>,
        apiKey: String?,
        now: Long,
    ): FetchResult {
        val ids =
            refs.mapNotNull { reference ->
                reference.coingeckoId?.takeIf { it.isNotEmpty() }
            }
        if (ids.isEmpty()) return FetchResult.Success(emptyList())

        val url =
            COINGECKO_URL
                .toHttpUrl()
                .newBuilder()
                .addQueryParameter("ids", ids.joinToString(","))
                .addQueryParameter("vs_currencies", "usd")
                .build()
        val builder = Request.Builder().url(url)
        val key = apiKey?.trim()?.takeIf { it.isNotEmpty() }
        if (key != null) builder.header("x-cg-demo-api-key", key)
        return execute(builder.build()) { payload -> parseCoinGeckoPrices(payload, refs, now) }
    }

    private fun execute(
        request: Request,
        parse: (String) -> List<Price>,
    ): FetchResult {
        return try {
            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    val transient = response.code == 408 || response.code == 429 || response.code >= 500
                    return FetchResult.Failure(transient)
                }
                val payload = response.body?.string() ?: ""
                FetchResult.Success(parse(payload))
            }
        } catch (_: IOException) {
            FetchResult.Failure(true)
        }
    }

    private sealed interface FetchResult {
        data class Success(
            val prices: List<Price>,
        ) : FetchResult

        data class Failure(
            val transient: Boolean,
        ) : FetchResult
    }

    companion object {
        private const val BINANCE_URL = "https://api.binance.com/api/v3/ticker/price"
        private const val COINGECKO_URL = "https://api.coingecko.com/api/v3/simple/price"

        fun defaultClient(): OkHttpClient =
            OkHttpClient.Builder()
                .connectTimeout(15, TimeUnit.SECONDS)
                .readTimeout(15, TimeUnit.SECONDS)
                .callTimeout(20, TimeUnit.SECONDS)
                .build()
    }
}

fun parseBinancePrices(
    payload: String,
    refs: List<MarketRef>,
    now: Long,
): List<Price> {
    val bySymbol = linkedMapOf<String, MarketRef>()
    for (reference in refs) {
        val symbol = reference.binanceSymbol
        if (!symbol.isNullOrEmpty()) bySymbol[symbol] = reference
    }
    if (bySymbol.isEmpty()) return emptyList()

    val rows =
        try {
            JSONArray(payload)
        } catch (_: JSONException) {
            return emptyList()
        }

    val prices = mutableListOf<Price>()
    for (index in 0 until rows.length()) {
        val row = rows.opt(index) as? JSONObject ?: continue
        val symbol = row.opt("symbol") as? String ?: continue
        val reference = bySymbol[symbol] ?: continue
        val price =
            when (val raw = row.opt("price")) {
                is Number -> raw.toDouble()
                is String -> raw.toDoubleOrNull()
                else -> null
            } ?: continue
        if (!price.isFinite() || price <= 0.0) continue
        prices.add(
            Price(
                key = reference.key,
                symbol = reference.symbol,
                provider = "binance",
                price = price,
                fetchedAt = now,
                sourceTimestamp = null,
            ),
        )
    }
    return prices
}

fun parseCoinGeckoPrices(
    payload: String,
    refs: List<MarketRef>,
    now: Long,
): List<Price> {
    val order = mutableListOf<String>()
    val byId = linkedMapOf<String, MarketRef>()
    for (reference in refs) {
        val id = reference.coingeckoId
        if (!id.isNullOrEmpty()) {
            if (!byId.containsKey(id)) order.add(id)
            byId[id] = reference
        }
    }
    if (byId.isEmpty()) return emptyList()

    val root =
        try {
            JSONObject(payload)
        } catch (_: JSONException) {
            return emptyList()
        }

    val prices = mutableListOf<Price>()
    for (id in order) {
        val reference = byId[id] ?: continue
        val row = root.optJSONObject(id) ?: continue
        val price = (row.opt("usd") as? Number)?.toDouble() ?: continue
        if (!price.isFinite() || price <= 0.0) continue
        prices.add(
            Price(
                key = reference.key,
                symbol = reference.symbol,
                provider = "coingecko",
                price = price,
                fetchedAt = now,
                sourceTimestamp = null,
            ),
        )
    }
    return prices
}
