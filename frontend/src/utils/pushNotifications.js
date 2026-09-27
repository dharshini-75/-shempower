import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { API_BASE_URL } from '../config/api';

/**
 * initPushNotifications
 * Registers device with FCM on Capacitor Android/iOS and sends FCM Token to Backend.
 */
export async function initPushNotifications(token, userLanguage = 'ta', onNavigate = null) {
  if (!Capacitor.isNativePlatform()) {
    console.log('[FCM Push] Running in Web environment — PushNotifications API active in web fallback mode.');
    return;
  }

  try {
    // 1. Request Notification Permission
    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive !== 'granted') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.warn('[FCM Push] Notification permissions denied by user.');
      return;
    }

    // 2. Create High Priority Notification Channel for Android
    try {
      await PushNotifications.createChannel({
        id: 'shempower_default_channel',
        name: 'SHEmpower Notifications',
        description: 'Android system push notifications for SHEmpower payment and loan updates',
        importance: 5, // High importance (shows banner, sound, vibration)
        visibility: 1, // Public (shows on lock screen)
        sound: 'default',
        vibration: true,
      });
    } catch (chanErr) {
      console.log('[FCM Push] Android Notification Channel created:', chanErr?.message);
    }

    // 3. Register with FCM
    await PushNotifications.register();

    // 4. Listen for FCM Device Token
    await PushNotifications.addListener('registration', async (fcmToken) => {
      console.log('[FCM Push] Received FCM Device Token:', fcmToken.value);
      if (token && fcmToken?.value) {
        try {
          await fetch(`${API_BASE_URL}/api/auth/fcm-token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              fcm_token: fcmToken.value,
              language: userLanguage || 'ta'
            })
          });
          console.log('[FCM Push] Device Token registered with backend for logged-in user.');
        } catch (e) {
          console.error('[FCM Push Error] Failed to register FCM token with backend:', e);
        }
      }
    });

    // 5. Handle Registration Error
    await PushNotifications.addListener('registrationError', (err) => {
      console.error('[FCM Push Error] FCM Registration Error:', err);
    });

    // 6. Handle Push Notification Received when App is Foregrounded
    await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[FCM Push Received Foreground]:', notification);
    });

    // 7. Handle Push Notification Tapped (Opens App and Navigates)
    await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('[FCM Push Action Performed]:', action);
      const data = action.notification?.data;
      if (data && data.screen && typeof onNavigate === 'function') {
        onNavigate(data.screen, data);
      }
    });

  } catch (error) {
    console.error('[FCM Push Exception]:', error);
  }
}
