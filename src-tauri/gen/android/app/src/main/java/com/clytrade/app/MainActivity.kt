package com.clytrade.app

import android.content.Intent
import android.content.res.Configuration
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge
import androidx.core.view.WindowCompat

class MainActivity : TauriActivity() {
  @Volatile private var darkTheme = false
  private val routeLock = Any()
  private var pendingRoute: String? = null

  override fun onCreate(savedInstanceState: Bundle?) {
    darkTheme =
      (resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) ==
        Configuration.UI_MODE_NIGHT_YES
    routeFrom(intent)?.let(::setPendingRoute)
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
    setIntent(intent)
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    routeFrom(intent)?.let(::setPendingRoute)
  }

  override fun onWebViewCreate(webView: WebView) {
    webView.addJavascriptInterface(
      object {
        @JavascriptInterface
        fun setDarkTheme(dark: Boolean) {
          runOnUiThread {
            darkTheme = dark
            applySystemBarAppearance()
          }
        }

        @JavascriptInterface
        fun setBackgroundMonitoring(enabled: Boolean) {
          MarketWorker.setMonitoring(applicationContext, enabled)
        }

        @JavascriptInterface
        fun writeBackgroundSnapshot(json: String) {
          MarketSnapshotStore.write(applicationContext, json)
        }

        @JavascriptInterface
        fun readBackgroundEvents(): String = MarketQueue.read(applicationContext)

        @JavascriptInterface
        fun clearBackgroundEvents() {
          MarketQueue.clear(applicationContext)
        }

        @JavascriptInterface
        fun consumePendingRoute(): String = takePendingRoute()
      },
      "ClyTradeNative"
    )
  }

  override fun onResume() {
    super.onResume()
    applySystemBarAppearance()
  }

  override fun onWindowFocusChanged(hasFocus: Boolean) {
    super.onWindowFocusChanged(hasFocus)
    if (hasFocus) {
      applySystemBarAppearance()
    }
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    applySystemBarAppearance()
  }

  private fun routeFrom(intent: Intent?): String? {
    if (intent?.getBooleanExtra(MarketNotifications.EXTRA_OPEN_ALERTS, false) != true) return null
    intent.removeExtra(MarketNotifications.EXTRA_OPEN_ALERTS)
    return MarketNotifications.ALERTS_ROUTE
  }

  private fun setPendingRoute(route: String?) {
    synchronized(routeLock) {
      pendingRoute = route
    }
  }

  private fun takePendingRoute(): String =
    synchronized(routeLock) {
      val route = pendingRoute
      pendingRoute = null
      route ?: ""
    }

  private fun applySystemBarAppearance() {
    WindowCompat.getInsetsController(window, window.decorView).apply {
      isAppearanceLightStatusBars = !darkTheme
      isAppearanceLightNavigationBars = !darkTheme
    }
  }
}
