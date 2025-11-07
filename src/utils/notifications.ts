import { PermissionsAndroid, Platform } from 'react-native';

/**
 * Requests Android 13+ POST_NOTIFICATIONS at runtime.
 * No-op on older Android and iOS.
 */
export async function ensureAndroidNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  if ((Platform.Version as number) < 33) return true;
  try {
    const res = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS as any
    );
    return res === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}
