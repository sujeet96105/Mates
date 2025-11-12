package com.billbuddy.app

import android.os.Bundle
import android.view.View
import android.view.ViewGroup
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

    WindowCompat.getInsetsController(window, window.decorView)?.apply {
      isAppearanceLightStatusBars = true
      isAppearanceLightNavigationBars = true
      systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_BARS_BY_SWIPE
    }

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
