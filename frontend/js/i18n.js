// NER SmartLogix — i18n engine

import { state } from './state.js';

const cache = {};

export async function loadLocale(lang) {
  if (cache[lang]) return;
  try {
    const res = await fetch(`/locales/${lang}.json`);
    if (!res.ok) throw new Error('locale not found');
    cache[lang] = await res.json();
  } catch (e) {
    if (lang !== 'en') {
      if (!cache['en']) {
        try {
          const res = await fetch('/locales/en.json');
          cache['en'] = await res.json();
        } catch (_) { cache['en'] = {}; }
      }
    } else {
      cache['en'] = {};
    }
  }
}

export function t(key) {
  const lang = state.language;
  if (cache[lang] && cache[lang][key]) return cache[lang][key];
  if (cache['en'] && cache['en'][key]) return cache['en'][key];
  return key; // last resort: show the key itself
}

export async function initI18n() {
  await loadLocale('en');
  if (state.language !== 'en') await loadLocale(state.language);
}
