import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import HttpApi from "i18next-http-backend";

i18n
  .use(HttpApi) // Loads translations from JSON files
  .use(LanguageDetector) // Detects the user's language
  .use(initReactI18next) // Passes i18n instance to React
  .init({
    fallbackLng: "en", // Default language
    debug: true, // Enable logging in development
    interpolation: {
      escapeValue: false, // React already escapes strings
    },
    backend: {
      loadPath: "/locales/{{lng}}/translation.json", // Path to translation files
    },
  });

export default i18n;