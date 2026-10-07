// Tarla'da en son açık sekme ve Pano'nun gruplaması. Uygulama kapanıp
// açılınca da hatırlansın diye preferences tablosuna yazıyoruz.
//
// Planda bunun için ayrı bir migration (view_prefs) vardı ama migration 3'teki
// preferences tablosu anahtar-değer olduğu için ona gerek kalmadı.
import { useCallback, useEffect, useState } from 'react';

import { getPreference, setPreference } from '../db/repositories/preferences';
import {
  isBoardGroup,
  isFieldTab,
  type BoardGroup,
  type FieldTab,
} from '../navigation/views';

const TAB_KEY = 'field.tab';
const GROUP_KEY = 'board.group';

export function useViewPrefs() {
  const [fieldTab, setFieldTabState] = useState<FieldTab>('farm');
  const [boardGroup, setBoardGroupState] = useState<BoardGroup>('stage');

  useEffect(() => {
    let cancelled = false;
    Promise.all([getPreference(TAB_KEY), getPreference(GROUP_KEY)])
      .then(([tab, group]) => {
        if (cancelled) return;
        if (tab && isFieldTab(tab)) setFieldTabState(tab);
        if (group && isBoardGroup(group)) setBoardGroupState(group);
      })
      .catch((error: unknown) => {
        if (__DEV__) console.warn('[gorunum] tercih okunamadi', error);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const save = (key: string, value: string) =>
    setPreference(key, value).catch((error: unknown) => {
      if (__DEV__) console.warn('[gorunum] tercih yazilamadi', error);
    });

  const setFieldTab = useCallback((tab: FieldTab) => {
    setFieldTabState(tab);
    void save(TAB_KEY, tab);
  }, []);

  const setBoardGroup = useCallback((group: BoardGroup) => {
    setBoardGroupState(group);
    void save(GROUP_KEY, group);
  }, []);

  return { fieldTab, setFieldTab, boardGroup, setBoardGroup };
}
