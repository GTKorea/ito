import type { Locale } from '@/stores/locale-store';

import en from '../../messages/en.json';
import ko from '../../messages/ko.json';
import ja from '../../messages/ja.json';
import zhCN from '../../messages/zh-CN.json';
import zhTW from '../../messages/zh-TW.json';
import es from '../../messages/es.json';
import fr from '../../messages/fr.json';
import de from '../../messages/de.json';
import pt from '../../messages/pt.json';

const messages: Record<Locale, typeof en> = {
  en,
  ko,
  ja,
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  es,
  fr,
  de,
  pt,
};

export function getMessages(locale: Locale) {
  return messages[locale] || messages.en;
}
