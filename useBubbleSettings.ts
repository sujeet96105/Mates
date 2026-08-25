import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Linking, Platform, AppState, AppStateStatus, DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthProvider';
import { useAppState } from './AppStateProvider';
import FloatingBubble from './src/native/FloatingBubble';
import { db } from './firebase';
import { collection, doc, setDoc } from 'firebase/firestore';

const STORAGE_KEY = 'mates:bubble:enabled';
const OVERLAY_SETTINGS_URL = 'package:com.billbuddy.app';

/**
 * useBubbleSettings
 *
 * Encapsulates all logic for the Floating Quick-Add Bubble toggle:
 *   - Reads persisted toggle state from AsyncStorage on mount
 *   - Handles SYSTEM_ALERT_WINDOW permission check + rationale dialog
 *   - Redirects to the system overlay permission screen when needed
 *   - Listens for AppState changes to detect when user returns from Settings
 *   - Calls FloatingBubble.startBubble / stopBubble appropriately
 *   - Keeps SharedPreferences up-to-date with user context for the Kotlin service
 *   - Listens for ON_QUICK_ADD_EXPENSE events from the native bubble service and saves to Firestore
 */
export function useBubbleSettings() {
  const { user } = useAuth();
  const { activeSessionId, categories, friends } = useAppState();

  const [bubbleEnabled, setBubbleEnabled] = useState(false);
  const [isLoading, setIsLoading]         = useState(true);

  // Track whether we're waiting to re-check the overlay permission after
  // the user returns from the Android Settings screen.
  const awaitingPermissionRef = useRef(false);

  // ── On mount: restore persisted toggle state ────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === 'true') {
          // Verify the overlay permission is still granted (user may have revoked it)
          const hasPermission = await FloatingBubble.canDrawOverlays();
          if (hasPermission) {
            setBubbleEnabled(true);
            syncUserInfoAndStart();
          } else {
            // Permission was revoked externally — reset stored state
            await AsyncStorage.setItem(STORAGE_KEY, 'false');
          }
        }
      } catch {
        // AsyncStorage read failure — treat as disabled
      } finally {
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Keep SharedPreferences in sync when user context changes ───────────
  useEffect(() => {
    if (bubbleEnabled && user && activeSessionId) {
      FloatingBubble.saveUserInfo(
        user.uid,
        user.displayName ?? user.email ?? 'Me',
        activeSessionId,
        categories.join(','),
        (friends || []).join(',')
      );
    }
  }, [bubbleEnabled, user, activeSessionId, categories, friends]);

  // ── Listen for Quick Add Expense requests from the floating bubble ─────
  useEffect(() => {
    let isProcessing = false;

    const sub = DeviceEventEmitter.addListener('ON_QUICK_ADD_EXPENSE', async (data: any) => {
      if (isProcessing) return;
      isProcessing = true;

      try {
        if (!user) {
          FloatingBubble.onExpenseSaveResult(false, 'User not signed in. Please open app.');
          isProcessing = false;
          return;
        }

        const sid = data.sessionId || activeSessionId || '';
        if (!sid) {
          FloatingBubble.onExpenseSaveResult(false, 'Please select or create a session in Mates first.');
          isProcessing = false;
          return;
        }

        const amount = Number(data.amount) || 0;
        if (amount <= 0) {
          FloatingBubble.onExpenseSaveResult(false, 'Please enter a valid amount.');
          isProcessing = false;
          return;
        }

        const splitWith = Array.isArray(data.splitWith)
          ? data.splitWith.filter((name: unknown): name is string => typeof name === 'string' && name.trim().length > 0)
          : [];
        if (splitWith.length === 0) {
          FloatingBubble.onExpenseSaveResult(false, 'Please choose at least one person to split with.');
          isProcessing = false;
          return;
        }

        const expensesCollectionRef = collection(db!, 'expenses');
        const newExpenseRef = doc(expensesCollectionRef);
        const createdAt = Date.now();

        const expenseToAdd = {
          description: data.description || 'Quick Expense',
          amount,
          paidBy: data.paidBy || user.displayName || 'Me',
          splitWith,
          category: data.category || 'Groceries',
          date: data.date || new Date().toISOString().split('T')[0],
          time: data.time || new Date().toLocaleTimeString(),
          userId: user.uid,
          sessionId: sid,
          createdAt,
          id: createdAt,
          firestoreId: newExpenseRef.id,
        };

        // Save to Firestore using authenticated Firebase JS instance.
        // AppStateProvider's realtime onSnapshot listener will automatically
        // receive the new document and update the expenses state without duplicates.
        await setDoc(newExpenseRef, expenseToAdd);

        FloatingBubble.onExpenseSaveResult(true, null);
      } catch (error: any) {
        console.error('[QuickAdd] Firestore save error:', error);
        FloatingBubble.onExpenseSaveResult(false, error?.message || 'Error saving to Firestore');
      } finally {
        isProcessing = false;
      }
    });

    return () => sub.remove();
  }, [user, activeSessionId]);

  // ── Listen for bubble dismiss (dragged to bottom remove zone) ──────────
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('ON_BUBBLE_DISMISSED', async () => {
      setBubbleEnabled(false);
      await AsyncStorage.setItem(STORAGE_KEY, 'false');
    });

    return () => sub.remove();
  }, []);

  // ── AppState listener — re-check permission after returning from Settings
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const sub = AppState.addEventListener('change', async (state: AppStateStatus) => {
      if (state === 'active' && awaitingPermissionRef.current) {
        awaitingPermissionRef.current = false;
        const granted = await FloatingBubble.canDrawOverlays();
        if (granted) {
          await persistAndStart(true);
        } else {
          // User denied — revert toggle
          setBubbleEnabled(false);
          await AsyncStorage.setItem(STORAGE_KEY, 'false');
          Alert.alert(
            'Permission Required',
            'The overlay permission was not granted. The bubble has been disabled.',
            [{ text: 'OK' }]
          );
        }
      }
    });

    return () => sub.remove();
  }, []);

  // ── Toggle handler (called by the Switch in SettingsTab) ────────────────
  const onToggle = useCallback(async (value: boolean) => {
    if (!value) {
      // Turn OFF immediately — no permission check needed
      await persistAndStop(false);
      return;
    }

    // Turn ON — check / request permission first
    if (Platform.OS !== 'android') {
      await persistAndStart(true);
      return;
    }

    const alreadyGranted = await FloatingBubble.canDrawOverlays();
    if (alreadyGranted) {
      await persistAndStart(true);
      return;
    }

    // Permission not yet granted — show rationale, then redirect
    Alert.alert(
      'Overlay Permission Needed',
      'To show the floating bubble while you use other apps, Mates needs the "Display over other apps" permission.\n\nYou\'ll be taken to Android Settings to grant it.',
      [
        {
          text: 'Not Now',
          style: 'cancel',
          onPress: () => {
            // Toggle stays OFF — don't persist true
            setBubbleEnabled(false);
          },
        },
        {
          text: 'Go to Settings',
          onPress: () => {
            awaitingPermissionRef.current = true;
            Linking.openURL(
              `android.settings.action.MANAGE_OVERLAY_PERMISSION?package=${OVERLAY_SETTINGS_URL}`
            ).catch(() => {
              // Fallback if the URI scheme isn't handled
              Linking.openSettings().catch(() => {});
            });
          },
        },
      ],
      { cancelable: false }
    );
  }, []);

  // ── Internal helpers ────────────────────────────────────────────────────

  async function persistAndStart(value: boolean) {
    setBubbleEnabled(value);
    await AsyncStorage.setItem(STORAGE_KEY, value ? 'true' : 'false');
    syncUserInfoAndStart();
  }

  async function persistAndStop(value: boolean) {
    setBubbleEnabled(value);
    await AsyncStorage.setItem(STORAGE_KEY, 'false');
    FloatingBubble.stopBubble();
  }

  function syncUserInfoAndStart() {
    if (user && activeSessionId) {
      FloatingBubble.saveUserInfo(
        user.uid,
        user.displayName ?? user.email ?? 'Me',
        activeSessionId,
        categories.join(','),
        (friends || []).join(',')
      );
    }
    FloatingBubble.startBubble();
  }

  return { bubbleEnabled, onToggle, isLoading };
}
