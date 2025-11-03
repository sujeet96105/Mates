import notifee, { AndroidImportance } from '@notifee/react-native';
import { Platform, PermissionsAndroid, ToastAndroid } from 'react-native';

export async function ensureNotificationPermissions() {
  // iOS permission
  if (Platform.OS === 'ios') {
    await notifee.requestPermission();
  }
  // Android 13+ POST_NOTIFICATIONS
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    try {
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS as any);
    } catch {}
  }
}

export async function notifyPdfSaved(filePath?: string | null) {
  try {
    await ensureNotificationPermissions();

    // Android channel
    let channelId: string | undefined = undefined;
    if (Platform.OS === 'android') {
      channelId = await notifee.createChannel({
        id: 'exports',
        name: 'Exports',
        importance: AndroidImportance.HIGH,
      });
    }

    const pathText = filePath ? `${filePath}` : 'Saved successfully';

    await notifee.displayNotification({
      title: 'Bill Buddy: PDF Exported',
      body: `Your expense PDF is saved at:\n${pathText}`,
      android: {
        channelId: channelId || 'exports',
        smallIcon: 'ic_export_notification',
        pressAction: { id: 'default' },
      },
      ios: {
        sound: 'default',
      },
    });
  } catch (e) {
    // Fallback toast on Android if notification fails
    if (Platform.OS === 'android') {
      try { ToastAndroid.show(`PDF saved${filePath ? ` to ${filePath}` : ''}`, ToastAndroid.LONG); } catch {}
    }
  }
}
