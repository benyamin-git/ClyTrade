package com.clytrade.app

import android.content.res.Configuration
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge
import androidx.core.view.WindowCompat

class MainActivity : TauriActivity() {
  @Volatile private var darkTheme = false

  override fun onCreate(savedInstanceState: Bundle?) {
    darkTheme =
      (resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) ==
        Configuration.UI_MODE_NIGHT_YES
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
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

  private fun applySystemBarAppearance() {
    WindowCompat.getInsetsController(window, window.decorView).apply {
      isAppearanceLightStatusBars = !darkTheme
      isAppearanceLightNavigationBars = !darkTheme
    }
  }
}
