import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en";
import zhTW from "./locales/zh-TW";

export type Language = "zh-TW" | "en";

void i18n.use(initReactI18next).init({
  resources: {
    "zh-TW": { translation: zhTW },
    en: { translation: en },
  },
  lng: "zh-TW",
  fallbackLng: "zh-TW",
  interpolation: {
    escapeValue: false,
  },
  returnNull: false,
});

export default i18n;
