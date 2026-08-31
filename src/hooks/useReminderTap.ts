/**
 * Ot hatırlatmasına dokunulduğunda ilgili notu bildiren kanca.
 *
 * İki yol var: uygulama zaten açıkken gelen dokunuş (listener) ve uygulamayı
 * bildirimin başlattığı durum (`getLastNotificationResponseAsync`). İkincisi
 * yeniden başlatmalar arasında da aynı yanıtı döndürdüğü için uygulama ömrü
 * başına bir kez işleniyor; aksi halde her açılışta aynı not açılırdı.
 */
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';

import { noteIdFromReminderId } from '../notifications/weedReminders';

let initialResponseHandled = false;

function noteIdFrom(response: Notifications.NotificationResponse): number | null {
  const request = response.notification.request;
  const fromIdentifier = noteIdFromReminderId(request.identifier);
  if (fromIdentifier !== null) return fromIdentifier;

  // Yedek yol: tanımlayıcı beklenmedik biçimdeyse içerikteki veriye bak.
  const raw = request.content.data?.noteId;
  const id = typeof raw === 'string' ? Number(raw) : raw;
  return typeof id === 'number' && Number.isInteger(id) ? id : null;
}

export function useReminderTap(onTap: (noteId: number) => void): void {
  useEffect(() => {
    let cancelled = false;

    if (!initialResponseHandled) {
      initialResponseHandled = true;
      Notifications.getLastNotificationResponseAsync()
        .then((response) => {
          if (cancelled || !response) return;
          const noteId = noteIdFrom(response);
          if (noteId !== null) onTap(noteId);
        })
        .catch((error: unknown) => {
          if (__DEV__) console.warn('[reminders] acilis yaniti okunamadi', error);
        });
    }

    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const noteId = noteIdFrom(response);
        if (noteId !== null) onTap(noteId);
      },
    );

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [onTap]);
}
