package com.clytrade.app

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class MarketApiTest {
    private fun refs(): List<MarketRef> =
        listOf(
            MarketRef(
                key = "binance:BTCUSDT",
                symbol = "BTC",
                binanceSymbol = "BTCUSDT",
                coingeckoId = "bitcoin",
            ),
            MarketRef(
                key = "coingecko:solana",
                symbol = "SOL",
                binanceSymbol = null,
                coingeckoId = "solana",
            ),
        )

    @Test
    fun binance_payload_parses_string_prices_and_skips_invalid_rows() {
        val prices =
            parseBinancePrices(
                """[{"symbol":"BTCUSDT","price":"101.5"},{"symbol":"ETHUSDT","price":"2"},{"symbol":"BTCUSDT","price":"-1"},{"symbol":"BTCUSDT","price":"oops"}]""",
                refs(),
                5,
            )
        assertEquals(1, prices.size)
        assertEquals(101.5, prices[0].price, 1e-9)
        assertEquals("binance:BTCUSDT", prices[0].key)
        assertEquals("binance", prices[0].provider)
        assertEquals(5L, prices[0].fetchedAt)
    }

    @Test
    fun binance_payload_rejects_a_corrupt_document() {
        assertTrue(parseBinancePrices("not json", refs(), 5).isEmpty())
        assertTrue(parseBinancePrices("""{"symbol":"BTCUSDT"}""", refs(), 5).isEmpty())
    }

    @Test
    fun binance_payload_returns_nothing_without_binance_refs() {
        val coingeckoOnly = refs().filter { it.binanceSymbol == null }
        assertTrue(parseBinancePrices("""[{"symbol":"BTCUSDT","price":"1"}]""", coingeckoOnly, 5).isEmpty())
    }

    @Test
    fun coingecko_payload_requires_a_positive_number() {
        val prices =
            parseCoinGeckoPrices(
                """{"bitcoin":{"usd":100.25},"solana":{"usd":2}}""",
                refs(),
                7,
            )
        assertEquals(2, prices.size)
        assertEquals(100.25, prices[0].price, 1e-9)
        assertEquals("binance:BTCUSDT", prices[0].key)
        assertEquals("coingecko", prices[0].provider)
        assertEquals(7L, prices[0].fetchedAt)
        assertEquals("coingecko:solana", prices[1].key)

        assertTrue(parseCoinGeckoPrices("""{"bitcoin":{"usd":"100"}}""", refs(), 7).isEmpty())
        assertTrue(parseCoinGeckoPrices("""{"bitcoin":{"usd":0}}""", refs(), 7).isEmpty())
        assertTrue(parseCoinGeckoPrices("""{"bitcoin":{"usd":-1}}""", refs(), 7).isEmpty())
        assertTrue(parseCoinGeckoPrices("not json", refs(), 7).isEmpty())
    }

    @Test
    fun coingecko_payload_preserves_ref_order() {
        val prices =
            parseCoinGeckoPrices(
                """{"solana":{"usd":2},"bitcoin":{"usd":100}}""",
                refs(),
                7,
            )
        assertEquals("binance:BTCUSDT", prices[0].key)
        assertEquals("coingecko:solana", prices[1].key)
    }

    @Test
    fun provider_candidates_only_include_mapped_refs() {
        val candidates = providerCandidates(refs(), "binance")
        assertEquals(1, candidates.size)
        assertEquals("BTCUSDT", candidates[0].binanceSymbol)

        val coingecko = providerCandidates(refs(), "coingecko")
        assertEquals(2, coingecko.size)

        assertTrue(providerCandidates(refs(), "auto").isEmpty())
        assertTrue(providerCandidates(refs(), "unknown").isEmpty())
    }

    @Test
    fun uncovered_refs_keep_the_ones_without_a_price() {
        val uncovered = uncoveredRefs(refs(), setOf("binance:BTCUSDT"))
        assertEquals(1, uncovered.size)
        assertEquals("coingecko:solana", uncovered[0].key)
    }
}
