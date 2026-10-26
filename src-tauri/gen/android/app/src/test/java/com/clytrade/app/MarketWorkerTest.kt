package com.clytrade.app

import androidx.lifecycle.Lifecycle
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class MarketWorkerTest {
    @Test
    fun skipsOnlyWhileTheAppIsStarted() {
        assertTrue(MarketWorker.shouldSkipForForeground(Lifecycle.State.STARTED))
        assertTrue(MarketWorker.shouldSkipForForeground(Lifecycle.State.RESUMED))
        assertFalse(MarketWorker.shouldSkipForForeground(Lifecycle.State.CREATED))
        assertFalse(MarketWorker.shouldSkipForForeground(Lifecycle.State.DESTROYED))
    }
}
