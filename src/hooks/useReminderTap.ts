/**
 * Ot hatırlatmasına dokununca hangi notun açılacağını söyleyen hook.
 *
 * İki durum var: uygulama açıkken gelen dokunuş (listener) ve uygulamayı
 * bildirimin başlattığı durum (getLastNotificationResponseAsync). İkincisi
 * her yeniden başlatmada aynı yanıtı döndürüyor, o yüzden bir kez işliyoruz.
 * Yoksa her açılışta aynı not açılıyordu.
 */
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';

import { noteIdFromReminderId } from '../notifications/weedReminders';

let initialResponseHandled = false;

function noteIdFrom(response: Notifications.NotificationResponse): number | null {
  const request = response.notification.request;
  const fromIdentifier = noteIdFromReminderId(request.identifier);
  if (fromIdentifier !== null) return fromIdentifier;

  // Identifier beklediğimiz biçimde değilse content.data'ya bakıyoruz.
  const raw = request.content.data?.noteId;
  const id = typeof raw === 'string' ? Number(raw) : raw;
  return typeof id === 'number' && Number.isInteger(id) ? id : null;
}

export function useReminderTap(onTap: (noteId: number) => void): void {
  useEffect(() => {
    let cancelled = false;

    if (!initialResponseHandled) {
      initialResponseHandled = true;
      // Bu çağrı senkron da hata atabiliyor (bildirim modülü hiç yoksa),
      // o yüzden tek başına .catch() yetmiyor.
      try {
        void Notifications.getLastNotificationResponseAsync()
          .then((response) => {
            if (cancelled || !response) return;
            const noteId = noteIdFrom(response);
            if (noteId !== null) onTap(noteId);
          })
          .catch((error: unknown) => {
            if (__DEV__) console.warn('[reminders] acilis yaniti okunamadi', error);
          });
      } catch (error) {
        if (__DEV__) console.warn('[reminders] acilis yaniti okunamadi', error);
      }
    }

    // Listener kurulumu senkron ve hata atabiliyor. expo-notifications her
    // ortamda tam desteklenmiyor (Expo Go'da Android kısıtlı). try'sız
    // bırakınca bildirimi olmayan ortamda bütün ekran çöküyordu. Kural:
    // bildirim hataları yutulur, uygulama onlarsız da çalışır.
    let subscription: Notifications.EventSubscription | null = null;
    try {
      subscription = Notifications.addNotificationResponseReceivedListener(
        (response) => {
          const noteId = noteIdFrom(response);
          if (noteId !== null) onTap(noteId);
        },
      );
    } catch (error) {
      if (__DEV__) console.warn('[reminders] dinleyici kurulamadi', error);
    }

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [onTap]);
}
