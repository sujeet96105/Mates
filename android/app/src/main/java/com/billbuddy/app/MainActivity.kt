package com.billbuddy.app

import android.content.res.Configuration
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.billbuddy.app.R.id
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  /**
   * Enable edge-to-edge display for Android 15+ compatibility while replacing deprecated APIs.
   * Ensures React Native content accounts for system bar insets.
   */
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    WindowCompat.setDecorFitsSystemWindows(window, false)
    applySystemBarAppearance()

    val rootView: View = window.decorView.findViewById(android.R.id.content)
    if (rootView is ViewGroup) {
      rootView.clipToPadding = false
    }
    if (rootView.id == View.NO_ID) {
      rootView.id = id.rootContainer
    }

    EdgeToEdgeHelper.applyInsets(rootView)
    ViewCompat.requestApplyInsets(rootView)
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    applySystemBarAppearance()
  }

  private fun applySystemBarAppearance() {
    val isDarkMode =
        (resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) ==
            Configuration.UI_MODE_NIGHT_YES

    val navigationColor = ContextCompat.getColor(this, R.color.nav_bar_color)
    window.navigationBarColor = navigationColor

    WindowCompat.getInsetsController(window, window.decorView)?.apply {
      isAppearanceLightStatusBars = !isDarkMode
      isAppearanceLightNavigationBars = !isDarkMode
      systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_BARS_BY_SWIPE
    }
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "Mates"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
