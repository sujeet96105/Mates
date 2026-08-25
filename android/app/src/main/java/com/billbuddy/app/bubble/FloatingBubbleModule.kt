package com.billbuddy.app.bubble

import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * FloatingBubbleModule
 *
 * React Native bridge module exposing bubble control and bidirectional
 * expense-saving bridge between the Kotlin FloatingBubbleService and
 * the authenticated Firebase JS SDK.
 */
class FloatingBubbleModule(
    private val reactCtx: ReactApplicationContext
) : ReactContextBaseJavaModule(reactCtx), LifecycleEventListener {

    companion object {
        @Volatile
        var instance: FloatingBubbleModule? = null
        private var saveResultCallback: ((Boolean, String?) -> Unit)? = null
    }

    init {
        instance = this
        reactCtx.addLifecycleEventListener(this)
    }

    override fun getName(): String = "FloatingBubble"

    // ── Public RN methods ─────────────────────────────────────────────────

    @ReactMethod
    fun startBubble() {
        val ctx = reactCtx.applicationContext
        val intent = Intent(ctx, FloatingBubbleService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            ctx.startForegroundService(intent)
        } else {
            ctx.startService(intent)
        }
    }

    @ReactMethod
    fun stopBubble() {
        val ctx = reactCtx.applicationContext
        ctx.stopService(Intent(ctx, FloatingBubbleService::class.java))
    }

    @ReactMethod
    fun canDrawOverlays(promise: Promise) {
        try {
            val granted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Settings.canDrawOverlays(reactCtx)
            } else {
                true
            }
            promise.resolve(granted)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun saveUserInfo(userId: String, displayName: String, sessionId: String, categories: String, friends: String) {
        val prefs = reactCtx.getSharedPreferences(
            FloatingBubbleService.PREFS_NAME,
            Context.MODE_PRIVATE
        )
        prefs.edit().apply {
            putString(FloatingBubbleService.KEY_USER_ID,      userId)
            putString(FloatingBubbleService.KEY_USER_DISPLAY, displayName)
            putString(FloatingBubbleService.KEY_SESSION_ID,   sessionId)
            putString(FloatingBubbleService.KEY_CATEGORIES,   categories)
            putString(FloatingBubbleService.KEY_FRIENDS,      friends)
        }.apply()
    }

    /**
     * Called from JS once the expense is saved to Firestore via Firebase JS SDK.
     */
    @ReactMethod
    fun onExpenseSaveResult(success: Boolean, errorMsg: String?) {
        Handler(Looper.getMainLooper()).post {
            saveResultCallback?.invoke(success, errorMsg)
            saveResultCallback = null
        }
    }

    // ── Kotlin-to-JS Event Dispatcher ─────────────────────────────────────

    fun sendQuickAddExpenseEvent(params: WritableMap, callback: (Boolean, String?) -> Unit) {
        saveResultCallback = callback

        // Set a 5s timeout in case JS fails to respond
        val timeoutHandler = Handler(Looper.getMainLooper())
        val timeoutRunnable = Runnable {
            if (saveResultCallback != null) {
                saveResultCallback?.invoke(false, "Save timeout. Please open app.")
                saveResultCallback = null
            }
        }
        timeoutHandler.postDelayed(timeoutRunnable, 6000)

        try {
            if (reactCtx.hasActiveReactInstance()) {
                reactCtx
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit("ON_QUICK_ADD_EXPENSE", params)
            } else {
                timeoutHandler.removeCallbacks(timeoutRunnable)
                callback(false, "App session inactive. Please open app.")
                saveResultCallback = null
            }
        } catch (e: Exception) {
            timeoutHandler.removeCallbacks(timeoutRunnable)
            callback(false, e.message ?: "Failed to reach app")
            saveResultCallback = null
        }
    }

    fun notifyBubbleDismissed() {
        try {
            if (reactCtx.hasActiveReactInstance()) {
                reactCtx
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit("ON_BUBBLE_DISMISSED", null)
            }
        } catch (_: Exception) {}
    }

    override fun onHostResume()  { /* no-op */ }
    override fun onHostPause()   { /* no-op */ }
    override fun onHostDestroy() { /* keep service alive on back/background */ }
}
