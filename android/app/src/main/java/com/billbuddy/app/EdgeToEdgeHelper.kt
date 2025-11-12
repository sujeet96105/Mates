package com.billbuddy.app

import android.view.View
import android.view.ViewGroup
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

object EdgeToEdgeHelper {

  /**
   * Applies system bar insets as padding to the given view, ensuring UI content
   * is laid out edge-to-edge without overlapping the status or navigation bars.
   */
  fun applyInsets(view: View) {
    if (view is ViewGroup) {
      view.clipToPadding = false
    }

    ViewCompat.setOnApplyWindowInsetsListener(view) { v, insets ->
      val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
      v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
      WindowInsetsCompat.CONSUMED
    }

    ViewCompat.requestApplyInsets(view)
  }
}

