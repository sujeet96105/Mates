import { NativeModules, Platform } from 'react-native';

/**
 * FloatingBubble — thin TypeScript wrapper around the native Android module.
 *
 * On non-Android platforms all methods are no-ops / return safe defaults.
 */
const { FloatingBubble: _native } = NativeModules;

const FloatingBubble = {
  /**
   * Start the floating bubble overlay service.
   * Only call this after confirming canDrawOverlays() === true.
   */
  startBubble(): void {
    if (Platform.OS === 'android' && _native) {
      _native.startBubble();
    }
  },

  /**
   * Stop the floating bubble overlay service.
   */
  stopBubble(): void {
    if (Platform.OS === 'android' && _native) {
      _native.stopBubble();
    }
  },

  /**
   * Resolves to true if the SYSTEM_ALERT_WINDOW overlay permission is granted.
   */
  async canDrawOverlays(): Promise<boolean> {
    if (Platform.OS !== 'android' || !_native) return false;
    try {
      return await _native.canDrawOverlays();
    } catch {
      return false;
    }
  },

  /**
   * Push authenticated user context into SharedPreferences so the Kotlin
   * service knows which Firestore document to write expenses to and who can split.
   *
   * @param userId        Firebase Auth UID
   * @param displayName   Human-readable name shown in the "Paid by" field
   * @param sessionId     Currently active expense session ID
   * @param categories    Comma-separated list of category names
   * @param friends       Comma-separated list of friend names
   */
  saveUserInfo(userId: string, displayName: string, sessionId: string, categories: string, friends: string): void {
    if (Platform.OS === 'android' && _native) {
      _native.saveUserInfo(userId, displayName, sessionId, categories, friends);
    }
  },

  /**
   * Callback to notify native bubble whether the expense save in Firebase JS was successful.
   */
  onExpenseSaveResult(success: boolean, errorMsg: string | null): void {
    if (Platform.OS === 'android' && _native) {
      _native.onExpenseSaveResult(success, errorMsg);
    }
  },
};

export default FloatingBubble;
