package com.clytrade.app

import android.content.Context
import android.util.Log
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive
import java.util.concurrent.TimeUnit

class MarketWorker(
    appContext: Context,
    params: WorkerParameters,
) : CoroutineWorker(appContext, params) {
    override suspend fun doWork(): Result {
        val snapshot = MarketSnapshotStore.read(applicationContext) ?: return Result.success()
        if (!snapshot.backgroundMonitoring) return Result.success()

        val refs = marketRefs(snapshot)
        if (refs.isEmpty()) return Result.success()

        val now = System.currentTimeMillis()
        val outcome =
            try {
                MarketApi().fetchPrices(snapshot, refs, now)
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                Log.w(TAG, "background fetch failed", error)
                return Result.retry()
            }

        if (isStopped) throw CancellationException("worker stopped")
        currentCoroutineContext().ensureActive()

        if (outcome.prices.isEmpty()) {
            return if (outcome.transientFailure) Result.retry() else Result.success()
        }

        val existing = MarketQueue.read(applicationContext)
        val cache = RuleStateCache()
        MarketRuleStateStore.seed(applicationContext, snapshot, cache, existing)
        val run = runSnapshot(snapshot, outcome.prices, existing, now, cache)

        if (isStopped) throw CancellationException("worker stopped")
        currentCoroutineContext().ensureActive()

        if (run.queued.isNotEmpty()) {
            if (!MarketQueue.write(applicationContext, run.queueJson)) {
                Log.w(TAG, "failed to write background events")
                return Result.retry()
            }
        }

        if (run.ruleUpdates.isNotEmpty()) {
            if (!MarketRuleStateStore.write(applicationContext, snapshot, cache, now)) {
                Log.w(TAG, "failed to write background rule state")
                return Result.retry()
            }
        }

        return Result.success()
    }

    companion object {
        const val WORK_NAME = "clytrade-market-poll"
        const val INTERVAL_MINUTES = 15L
        private const val TAG = "MarketWorker"

        fun setMonitoring(
            context: Context,
            enabled: Boolean,
        ) {
            val workManager = WorkManager.getInstance(context)
            if (!enabled) {
                workManager.cancelUniqueWork(WORK_NAME)
                return
            }
            val request =
                PeriodicWorkRequestBuilder<MarketWorker>(INTERVAL_MINUTES, TimeUnit.MINUTES)
                    .setConstraints(
                        Constraints
                            .Builder()
                            .setRequiredNetworkType(NetworkType.CONNECTED)
                            .build(),
                    )
                    .build()
            workManager.enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.UPDATE,
                request,
            )
        }
    }
}
