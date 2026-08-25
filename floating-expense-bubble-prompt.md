# Prompt: Floating "Quick Add Expense" Bubble Feature

## ROLE
You are an agentic coding assistant working inside my existing expense-tracking app repository. Do not start writing feature code immediately. Follow the phases below in order.

---

## PHASE 1 — ANALYZE THE PROJECT FIRST (mandatory, do this before any code)

1. Scan the repository structure and identify:
   - Platform/framework (native Android/Kotlin, Flutter, React Native, etc.)
   - Current architecture pattern (MVVM, Clean Architecture, etc.)
   - Existing Settings screen implementation and how toggles/switches are built there
   - Existing permission-handling code (if any) and how runtime permissions are currently requested
   - The "Add Expense" flow — the screen, ViewModel/controller, and data layer it calls into, since the bubble must reuse this exact logic, not duplicate it
   - Minimum SDK / target SDK (relevant because "draw over other apps" permission handling differs across Android versions)
   - Whether the app already has a foreground service or background service pattern
2. Summarize findings back to me before proceeding: architecture, relevant files/paths, and any constraints or risks you see for this feature.
3. Only after this analysis is confirmed, move to Phase 2.

---

## PHASE 2 — FEATURE SPEC

Implement a **floating icon / chat-head style bubble** (like Facebook Messenger) that lets the user add an expense without opening the app, with these exact requirements:

### 1. Settings toggle
- Add a new row in the Settings screen: **"Floating Quick-Add Bubble"** with a Switch/Slider component matching the existing settings UI style.
- Persist the toggle state (DataStore/SharedPreferences/whatever the app already uses for settings).

### 2. Permission flow (Android "Display over other apps" / `SYSTEM_ALERT_WINDOW`)
- When the user turns the toggle **ON**:
  - Check if `Settings.canDrawOverlays(context)` is already true.
  - If **not** granted, do **not** silently fail — redirect the user directly to the system permission screen via:
    ```
    Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:$packageName"))
    ```
  - Show a short, clear rationale dialog *before* redirecting (Play Store policy requires this): explain why the permission is needed ("to let you add expenses instantly without opening the app").
  - Listen for the result (via `onResume`/lifecycle check, since this permission doesn't return a standard activity result) and only flip the toggle to ON in app state once permission is confirmed granted.
  - If the user denies/cancels, toggle should revert to OFF automatically — never show an inconsistent state.
- When toggle is turned **OFF**: stop and destroy the floating service immediately, no restart on reboot unless the toggle is ON.

### 3. Floating bubble behavior (must NOT interfere with other apps/games)
- Implement using a lightweight foreground `Service` + `WindowManager` overlay (small icon, ~48-56dp).
- Bubble must:
  - Be **draggable** and snap to the nearest screen edge on release (like Messenger chat heads) so it never sits mid-screen blocking content.
  - Have a small hit-target only around the icon itself — must NOT intercept touches outside its own bounds, so games/other apps underneath remain fully usable.
  - Support a "collapse to edge" or auto-fade-to-semi-transparent state after a few seconds of inactivity, and become fully opaque again on touch.
  - Include a simple way to dismiss/hide it temporarily (e.g., drag to a bottom "remove" zone, similar to Messenger) without turning off the whole feature.
  - Never appear on top of system-critical UI (lock screen, status bar) — respect Android's overlay z-order rules; do not use TYPE_SYSTEM_ALERT on modern APIs, use `TYPE_APPLICATION_OVERLAY` for API 26+.
- Tapping the bubble opens a **compact quick-add expense form** (amount, category, note) as a small floating window/dialog overlay — not the full app — then closes back to the bubble after saving.
- The quick-add form must call into the **same ViewModel/repository logic** identified in Phase 1 so data stays consistent with the main app (no duplicate/divergent expense-saving code paths).

### 4. Performance & battery optimization
- Service should be lightweight and idle when not in use — no polling loops.
- Release the overlay view and unbind listeners in `onDestroy()` to avoid memory leaks (a common bug with overlay services).
- Avoid keeping the process alive unnecessarily; use a low-priority foreground notification only if required by the OS version, with clear notification text (e.g., "Quick-add bubble is active").
- Test that the bubble does not cause dropped frames or input lag on top of the graphics-heavy apps.

### 5. Legal/compliance notes to implement
- `SYSTEM_ALERT_WINDOW` is a special permission — cannot be requested via the normal runtime permission dialog; must go through Settings as above. Make sure the manifest declares it correctly:
  ```xml
  <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW"/>
  ```
- Add the rationale dialog copy (Phase 2.2) — this is required for Play Store review compliance on sensitive permissions.
- If using a foreground service, declare the correct `foregroundServiceType` in the manifest per current Play policy.

---

## PHASE 3 — DELIVERABLES
1. List of files created/modified.
2. The settings toggle UI + persistence code.
3. Permission-check-and-redirect logic.
4. The floating bubble Service + WindowManager overlay implementation.
5. The compact quick-add overlay form wired to existing expense-saving logic.
6. A short test checklist (toggle on/off, permission denied/granted paths, bubble drag/snap, bubble doesn't block touches to underlying apps, service cleanup on OFF/reboot).

Do not skip Phase 1. Report back your analysis summary before writing implementation code.
