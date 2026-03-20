import type { Locale } from '@/stores/locale-store';

import en from '../../messages/en.json';
import ko from '../../messages/ko.json';

const messages: Record<Locale, typeof en> = {
  en,
  ko,
};

export function getMessages(locale: Locale) {
  return messages[locale] || messages.en;
}
