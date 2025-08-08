import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const loadResources = async () => {
  const [en, es] = await Promise.all([
    fetch('/locales/en/translation.json').then((res) => res.json()),
    fetch('/locales/es/translation.json').then((res) => res.json()),
  ]);

  await i18n
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: en },
        es: { translation: es },
      },
      lng: 'en',
      fallbackLng: 'en',
      interpolation: { escapeValue: false },
    });
};

loadResources();

export default i18n;
