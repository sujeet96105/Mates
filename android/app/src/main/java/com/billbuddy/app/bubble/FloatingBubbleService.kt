package com.billbuddy.app.bubble

import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.graphics.PixelFormat
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.view.Gravity
import android.view.LayoutInflater
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import com.billbuddy.app.MainActivity
import com.billbuddy.app.R
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * FloatingBubbleService
 *
 * Foreground service that renders a draggable chat-head style bubble using
 * WindowManager with the Bill Buddy logo. Tapping opens a quick-add expense form
 * with full "Paid By", "Split With", and "Category" support, writing directly
 * to the Firestore "expenses" collection.
 */
class FloatingBubbleService : Service() {

    // ── WindowManager & views ─────────────────────────────────────────────
    private lateinit var windowManager: WindowManager
    private var bubbleView: View? = null
    private var quickAddView: View? = null
    private var backdropView: View? = null
    private var bubbleParams: WindowManager.LayoutParams? = null

    // ── Screen dimensions ─────────────────────────────────────────────────
    private var screenWidth = 0
    private var screenHeight = 0

    // ── Drag state ────────────────────────────────────────────────────────
    private var initialX = 0
    private var initialY = 0
    private var initialTouchX = 0f
    private var initialTouchY = 0f
    private var isDragging = false

    // ── Dismiss zone ──────────────────────────────────────────────────────
    private var dismissView: View? = null

    // ── Auto-fade handler ─────────────────────────────────────────────────
    private val handler = Handler(Looper.getMainLooper())
    private val fadeRunnable = Runnable {
        bubbleView?.animate()?.alpha(0.4f)?.setDuration(400)?.start()
    }
    private val FADE_DELAY_MS = 3_000L

    // ── Form State ────────────────────────────────────────────────────────
    private var selectedCategory = "Groceries"
    private var selectedPaidBy = ""
    private val selectedSplitWith = mutableSetOf<String>()

    // ── SharedPreferences keys ───────────────────────────────────────────
    companion object {
        const val PREFS_NAME           = "MatesBubblePrefs"
        const val KEY_USER_ID          = "userId"
        const val KEY_USER_DISPLAY     = "userDisplayName"
        const val KEY_SESSION_ID       = "activeSessionId"
        const val KEY_CATEGORIES       = "categories"
        const val KEY_FRIENDS          = "friends"
        const val NOTIF_CHANNEL_ID     = "bubble_service_channel"
        const val NOTIF_ID             = 8901
    }

    // ── WindowManager overlay type ────────────────────────────────────────
    @Suppress("DEPRECATION")
    private val overlayType: Int
        get() = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        else
            WindowManager.LayoutParams.TYPE_PHONE

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()

        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager

        val displayMetrics = resources.displayMetrics
        screenWidth  = displayMetrics.widthPixels
        screenHeight = displayMetrics.heightPixels

        createNotificationChannel()
        startForeground(NOTIF_ID, buildNotification())
        addBubble()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int =
        START_STICKY

    override fun onDestroy() {
        super.onDestroy()
        handler.removeCallbacksAndMessages(null)
        safeRemoveView(bubbleView)
        safeRemoveView(quickAddView)
        safeRemoveView(backdropView)
        safeRemoveView(dismissView)
        bubbleView    = null
        quickAddView  = null
        backdropView  = null
        dismissView   = null
    }

    // ─────────────────────────────────────────────────────────────────────
    // Bubble
    // ─────────────────────────────────────────────────────────────────────

    @SuppressLint("InflateParams", "ClickableViewAccessibility")
    private fun addBubble() {
        val inflater = LayoutInflater.from(this)
        val view = inflater.inflate(R.layout.bubble_layout, null)
        bubbleView = view

        val bubbleSize = dpToPx(56)

        bubbleParams = WindowManager.LayoutParams(
            bubbleSize,
            bubbleSize,
            overlayType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = screenWidth - bubbleSize - dpToPx(8)
            y = screenHeight / 3
        }

        windowManager.addView(view, bubbleParams)
        scheduleFade()

        view.setOnTouchListener { v, event ->
            handleBubbleTouch(v, event)
        }
    }

    @SuppressLint("ClickableViewAccessibility")
    private fun handleBubbleTouch(v: View, event: MotionEvent): Boolean {
        val params = bubbleParams ?: return false

        when (event.action) {
            MotionEvent.ACTION_DOWN -> {
                isDragging    = false
                initialX      = params.x
                initialY      = params.y
                initialTouchX = event.rawX
                initialTouchY = event.rawY
                handler.removeCallbacks(fadeRunnable)
                bubbleView?.animate()?.alpha(1f)?.setDuration(150)?.start()
                // Do NOT show dismiss zone on ACTION_DOWN!
                return true
            }

            MotionEvent.ACTION_MOVE -> {
                val dx = (event.rawX - initialTouchX).toInt()
                val dy = (event.rawY - initialTouchY).toInt()

                // Only trigger drag when moving past threshold
                if (!isDragging && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
                    isDragging = true
                    showDismissZone() // Only show dismiss zone when actual dragging starts
                }

                if (isDragging) {
                    val bubbleSize = dpToPx(56)
                    params.x = (initialX + dx).coerceIn(0, screenWidth - bubbleSize)
                    params.y = (initialY + dy).coerceIn(dpToPx(8), screenHeight - bubbleSize - dpToPx(8))
                    windowManager.updateViewLayout(bubbleView, params)
                }
                return true
            }

            MotionEvent.ACTION_UP -> {
                hideDismissZone()

                if (isDragging) {
                    val bubbleSize = dpToPx(56)
                    // Check if dropped near bottom 15% of screen (dismiss zone)
                    if (params.y + bubbleSize > screenHeight * 0.82) {
                        hideBubbleTemporarily()
                        return true
                    }
                    snapToEdge(params, bubbleSize)
                } else {
                    // Tap — toggle quick-add form
                    if (quickAddView == null) {
                        openQuickAddForm()
                    } else {
                        closeQuickAddForm()
                    }
                }
                scheduleFade()
                return true
            }
        }
        return false
    }

    private fun snapToEdge(params: WindowManager.LayoutParams, bubbleSize: Int) {
        val midScreen = screenWidth / 2
        val targetX = if (params.x + bubbleSize / 2 < midScreen) dpToPx(8)
                      else screenWidth - bubbleSize - dpToPx(8)
        params.x = targetX
        params.y = params.y.coerceIn(dpToPx(8), screenHeight - bubbleSize - dpToPx(8))
        windowManager.updateViewLayout(bubbleView, params)
    }

    private fun scheduleFade() {
        handler.removeCallbacks(fadeRunnable)
        handler.postDelayed(fadeRunnable, FADE_DELAY_MS)
    }

    // ─────────────────────────────────────────────────────────────────────
    // Dismiss zone (styled banner at bottom, ONLY appears during drag)
    // ─────────────────────────────────────────────────────────────────────

    @SuppressLint("InflateParams")
    private fun showDismissZone() {
        if (dismissView != null) return

        val container = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setBackgroundColor(0xCCEF4444.toInt()) // Soft translucent red
            setPadding(dpToPx(16), dpToPx(12), dpToPx(16), dpToPx(16))
            alpha = 0f

            val label = TextView(context).apply {
                text = "✕  Drop here to hide bubble"
                setTextColor(0xFFFFFFFF.toInt())
                textSize = 14f
                gravity = Gravity.CENTER
            }
            addView(label)
        }

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            dpToPx(72),
            overlayType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                    or WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL
            y = 0
        }

        dismissView = container
        windowManager.addView(container, params)
        container.animate().alpha(1f).setDuration(180).start()
    }

    private fun hideDismissZone() {
        safeRemoveView(dismissView)
        dismissView = null
    }

    private fun hideBubbleTemporarily() {
        // Stop any ongoing animations and callbacks
        handler.removeCallbacksAndMessages(null)
        bubbleView?.animate()?.cancel()
        quickAddView?.animate()?.cancel()
        dismissView?.animate()?.cancel()

        // Notify React Native JS so the Settings toggle automatically switches to OFF
        FloatingBubbleModule.instance?.notifyBubbleDismissed()

        // Smooth fade out animation
        bubbleView?.apply {
            // Disable touch events during animation
            isClickable = false
            isFocusable = false

            animate()
                .alpha(0f)
                .setDuration(250)
                .withEndAction {
                    // Clean up all views
                    safeRemoveView(bubbleView)
                    safeRemoveView(quickAddView)
                    safeRemoveView(backdropView)
                    safeRemoveView(dismissView)

                    // Stop service after cleanup
                    stopSelf()
                }
                .start()
        }

        Toast.makeText(this, "Bubble closed", Toast.LENGTH_SHORT).show()
    }

    // ─────────────────────────────────────────────────────────────────────
    // Quick-Add Form with Paid By & Split With
    // ─────────────────────────────────────────────────────────────────────

    @SuppressLint("InflateParams")
    private fun openQuickAddForm() {
        hideDismissZone()

        // Hide the bubble when modal opens
        bubbleView?.visibility = View.GONE

        // Add semi-transparent backdrop
        showBackdrop()

        val inflater = LayoutInflater.from(this)
        val view = inflater.inflate(R.layout.quick_add_expense_layout, null)
        quickAddView = view

        // Beautifully centered with comfortable margins on all screen sizes
        val formWidth  = Math.min(dpToPx(340), screenWidth - dpToPx(32))
        val formHeight = WindowManager.LayoutParams.WRAP_CONTENT

        val params = WindowManager.LayoutParams(
            formWidth,
            formHeight,
            overlayType,
            WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL
                    or WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.CENTER_HORIZONTAL or Gravity.TOP
            x = 0
            y = Math.max(dpToPx(70), (screenHeight - dpToPx(500)) / 2)
        }

        windowManager.addView(view, params)
        view.setOnTouchListener { _, event ->
            if (event.action == MotionEvent.ACTION_OUTSIDE) {
                closeQuickAddForm()
                true
            } else {
                false
            }
        }
        view.alpha = 0f
        view.animate().alpha(1f).setDuration(200).start()

        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

        // Parse user + friends
        val currentUser = prefs.getString(KEY_USER_DISPLAY, "You") ?: "You"
        val friendsRaw  = prefs.getString(KEY_FRIENDS, "") ?: ""
        val friendsList = if (friendsRaw.isNotEmpty()) friendsRaw.split(",").filter { it.isNotBlank() } else emptyList()

        // Combine all people (Current user + all friends)
        val allPeople = mutableListOf<String>()
        if (currentUser.isNotEmpty()) allPeople.add(currentUser)
        friendsList.forEach { if (!allPeople.contains(it)) allPeople.add(it) }

        // Default Paid By to current user
        selectedPaidBy = if (allPeople.contains(currentUser)) currentUser else (allPeople.firstOrNull() ?: "You")

        // Default Split With to all people
        selectedSplitWith.clear()
        selectedSplitWith.addAll(allPeople)

        // Setup Paid By chips
        val paidByContainer = view.findViewById<LinearLayout>(R.id.paidByChipsContainer)
        populatePaidByChips(paidByContainer, allPeople)

        // Setup Split With chips
        val splitWithContainer = view.findViewById<LinearLayout>(R.id.splitWithChipsContainer)
        populateSplitWithChips(splitWithContainer, allPeople)

        // Setup Category chips
        val catString = prefs.getString(KEY_CATEGORIES, "Groceries,Utilities,Rent,Internet,Household Items,Entertainment,Other")
        val categories = catString?.split(",")?.filter { it.isNotBlank() } ?: listOf("Groceries", "Other")
        val categoryContainer = view.findViewById<LinearLayout>(R.id.categoryChipsContainer)
        populateCategoryChips(categoryContainer, categories)

        // Close button
        view.findViewById<TextView>(R.id.btnCloseQuickAdd)?.setOnClickListener {
            closeQuickAddForm()
        }

        // Save button
        view.findViewById<TextView>(R.id.btnSaveExpense)?.setOnClickListener {
            saveExpense(view, prefs)
        }
    }

    private fun populatePaidByChips(container: LinearLayout, allPeople: List<String>) {
        container.removeAllViews()
        allPeople.forEach { person ->
            val isSelected = (person == selectedPaidBy)
            val chip = TextView(this).apply {
                text = person
                textSize = 13f
                setTextColor(if (isSelected) 0xFFFFFFFF.toInt() else 0xFFCBD5E1.toInt())
                setPadding(dpToPx(14), dpToPx(8), dpToPx(14), dpToPx(8))
                setBackgroundResource(if (isSelected) R.drawable.chip_selected_background else R.drawable.chip_unselected_background)
                val lp = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply { setMargins(0, 0, dpToPx(8), 0) }
                layoutParams = lp
                setOnClickListener {
                    selectedPaidBy = person
                    populatePaidByChips(container, allPeople)
                }
            }
            container.addView(chip)
        }
    }

    private fun populateSplitWithChips(container: LinearLayout, allPeople: List<String>) {
        container.removeAllViews()

        // "Select All" chip
        val allSelected = allPeople.isNotEmpty() && selectedSplitWith.containsAll(allPeople)
        val selectAllChip = TextView(this).apply {
            text = "Select All"
            textSize = 13f
            setTextColor(if (allSelected) 0xFFFFFFFF.toInt() else 0xFFCBD5E1.toInt())
            setPadding(dpToPx(14), dpToPx(8), dpToPx(14), dpToPx(8))
            setBackgroundResource(if (allSelected) R.drawable.chip_selected_background else R.drawable.chip_unselected_background)
            val lp = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { setMargins(0, 0, dpToPx(8), 0) }
            layoutParams = lp
            setOnClickListener {
                if (allSelected) {
                    selectedSplitWith.clear()
                } else {
                    selectedSplitWith.clear()
                    selectedSplitWith.addAll(allPeople)
                }
                populateSplitWithChips(container, allPeople)
            }
        }
        container.addView(selectAllChip)

        // Individual person chips
        allPeople.forEach { person ->
            val isSelected = selectedSplitWith.contains(person)
            val chip = TextView(this).apply {
                text = person
                textSize = 13f
                setTextColor(if (isSelected) 0xFFFFFFFF.toInt() else 0xFFCBD5E1.toInt())
                setPadding(dpToPx(14), dpToPx(8), dpToPx(14), dpToPx(8))
                setBackgroundResource(if (isSelected) R.drawable.chip_selected_background else R.drawable.chip_unselected_background)
                val lp = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply { setMargins(0, 0, dpToPx(8), 0) }
                layoutParams = lp
                setOnClickListener {
                    if (selectedSplitWith.contains(person)) {
                        selectedSplitWith.remove(person)
                    } else {
                        selectedSplitWith.add(person)
                    }
                    populateSplitWithChips(container, allPeople)
                }
            }
            container.addView(chip)
        }
    }

    private fun populateCategoryChips(container: LinearLayout, categories: List<String>) {
        container.removeAllViews()
        categories.forEach { category ->
            val isSelected = (category == selectedCategory)
            val chip = TextView(this).apply {
                text = category
                textSize = 13f
                setTextColor(if (isSelected) 0xFFFFFFFF.toInt() else 0xFFCBD5E1.toInt())
                setPadding(dpToPx(14), dpToPx(8), dpToPx(14), dpToPx(8))
                setBackgroundResource(if (isSelected) R.drawable.chip_selected_background else R.drawable.chip_unselected_background)
                val lp = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply { setMargins(0, 0, dpToPx(8), 0) }
                layoutParams = lp
                setOnClickListener {
                    selectedCategory = category
                    populateCategoryChips(container, categories)
                }
            }
            container.addView(chip)
        }
    }

    private fun closeQuickAddForm() {
        val view = quickAddView ?: return
        quickAddView = null

        // Fade out modal and backdrop simultaneously
        view.animate()?.alpha(0f)?.setDuration(200)?.withEndAction {
            safeRemoveView(view)
        }?.start()

        // Hide backdrop with same timing
        hideBackdrop()

        // Show bubble after a brief delay to avoid flicker
        handler.postDelayed({
            bubbleView?.visibility = View.VISIBLE
            bubbleView?.alpha = 1f
        }, 150)
    }

    // ─────────────────────────────────────────────────────────────────────
    // Backdrop for modal
    // ─────────────────────────────────────────────────────────────────────

    @SuppressLint("InflateParams")
    private fun showBackdrop() {
        if (backdropView != null) return

        val backdrop = View(this).apply {
            setBackgroundColor(0x80000000.toInt()) // Semi-transparent black (50% opacity)
            alpha = 0f
        }

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            overlayType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                    or WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = 0
            y = 0
        }

        backdropView = backdrop
        windowManager.addView(backdrop, params)
        backdrop.animate().alpha(1f).setDuration(200).start()
    }

    private fun hideBackdrop() {
        val view = backdropView ?: return
        backdropView = null
        view.animate()?.alpha(0f)?.setDuration(150)?.withEndAction {
            safeRemoveView(view)
        }?.start()
    }

    // ─────────────────────────────────────────────────────────────────────
    // Expense Saving (Dispatches to authenticated React Native Firebase JS)
    // ─────────────────────────────────────────────────────────────────────

    private fun saveExpense(formView: View, prefs: SharedPreferences) {
        val description = formView.findViewById<EditText>(R.id.etDescription)?.text?.toString()?.trim() ?: ""
        val amountStr   = formView.findViewById<EditText>(R.id.etAmount)?.text?.toString()?.trim() ?: ""
        val amount      = amountStr.toDoubleOrNull() ?: 0.0

        if (description.isEmpty()) {
            showStatus(formView, "Please enter a description", isError = true)
            return
        }
        if (amount <= 0) {
            showStatus(formView, "Please enter a valid amount", isError = true)
            return
        }
        if (selectedPaidBy.isEmpty()) {
            showStatus(formView, "Please select who paid", isError = true)
            return
        }
        if (selectedSplitWith.isEmpty()) {
            showStatus(formView, "Please choose at least one person to split with", isError = true)
            return
        }

        val userId    = prefs.getString(KEY_USER_ID, null)
        val sessionId = prefs.getString(KEY_SESSION_ID, null)

        if (userId.isNullOrEmpty()) {
            showStatus(formView, "Please open the app first to sync login", isError = true)
            return
        }

        val module = FloatingBubbleModule.instance
        if (module == null) {
            showStatus(formView, "App is closed. Please open Bill Buddy.", isError = true)
            return
        }

        showStatus(formView, "Saving expense...", isError = false)

        val now     = Date()
        val dateFmt = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        val timeFmt = SimpleDateFormat("HH:mm:ss", Locale.getDefault())

        val expenseMap = com.facebook.react.bridge.Arguments.createMap().apply {
            putString("description", description)
            putDouble("amount", amount)
            putString("paidBy", selectedPaidBy)
            val splitArray = com.facebook.react.bridge.Arguments.createArray()
            selectedSplitWith.forEach { splitArray.pushString(it) }
            putArray("splitWith", splitArray)
            putString("category", selectedCategory)
            putString("date", dateFmt.format(now))
            putString("time", timeFmt.format(now))
            putString("sessionId", sessionId ?: "")
            putString("userId", userId)
        }

        module.sendQuickAddExpenseEvent(expenseMap) { success, errorMsg ->
            if (success) {
                showStatus(formView, "✓ Expense added!", isError = false)
                handler.postDelayed({ closeQuickAddForm() }, 1000)
            } else {
                showStatus(formView, "Failed: ${errorMsg ?: "Could not save"}", isError = true)
            }
        }
    }

    private fun showStatus(formView: View, message: String, isError: Boolean) {
        val tv = formView.findViewById<TextView>(R.id.tvStatus) ?: return
        tv.text = message
        tv.setTextColor(if (isError) 0xFFEF4444.toInt() else 0xFF10B981.toInt())
        tv.visibility = View.VISIBLE
    }

    // ─────────────────────────────────────────────────────────────────────
    // Notification
    // ─────────────────────────────────────────────────────────────────────

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                NOTIF_CHANNEL_ID,
                "Quick-Add Bubble",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Floating bubble for quick expense entry"
                setShowBadge(false)
            }
            (getSystemService(NOTIFICATION_SERVICE) as NotificationManager)
                .createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        val openIntent = Intent(this, MainActivity::class.java)
        val pendingFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M)
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        else
            PendingIntent.FLAG_UPDATE_CURRENT
        val pendingIntent = PendingIntent.getActivity(this, 0, openIntent, pendingFlags)

        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, NOTIF_CHANNEL_ID)
                .setContentTitle("Quick-add bubble is active")
                .setContentText("Tap to open Bill Buddy")
                .setSmallIcon(android.R.drawable.ic_input_add)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .build()
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
                .setContentTitle("Quick-add bubble is active")
                .setContentText("Tap to open Bill Buddy")
                .setSmallIcon(android.R.drawable.ic_input_add)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .build()
        }
    }

    private fun dpToPx(dp: Int): Int =
        (dp * resources.displayMetrics.density).toInt()

    private fun safeRemoveView(view: View?) {
        try {
            if (view != null && view.windowToken != null) {
                windowManager.removeView(view)
            }
        } catch (_: Exception) {}
    }
}
