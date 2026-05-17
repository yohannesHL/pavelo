/**
 * i18n Setup — Multi-language support (S6-08)
 *
 * Simple client-side i18n with JSON dictionaries.
 * Supports English + Spanish for MVP, expandable to all 6 languages.
 *
 * Usage:
 *   import { useTranslation } from "@/i18n";
 *   const { t, locale, setLocale } = useTranslation();
 *   <p>{t("voice.startCall")}</p>
 */

"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

// --- Dictionaries ---

const dictionaries = {
  en: {
    // Voice
    "voice.title": "Talk to Xara",
    "voice.subtitle": "Start a voice conversation with your AI estate agent.",
    "voice.startCall": "Start Call",
    "voice.endCall": "End Call",
    "voice.mute": "Mute",
    "voice.unmute": "Unmute",
    "voice.connected": "Connected",
    "voice.connecting": "Connecting...",
    "voice.disconnected": "Disconnected",
    "voice.signInRequired": "Sign in to use voice mode",
    "voice.transcriptionPlaceholder": "Transcription will appear here...",
    "voice.listening": "Listening",
    "voice.thinking": "Thinking",
    "voice.speaking": "Speaking",
    "voice.viewInChat": "View in chat",
    "voice.tryAgain": "Try Again",
    "voice.recordingConsent": "I consent to session recording for quality improvement",

    // Navigation
    "nav.properties": "Properties",
    "nav.chat": "Chat",
    "nav.voice": "Voice",
    "nav.dashboard": "Dashboard",
    "nav.signIn": "Sign In",

    // Common
    "common.loading": "Loading...",
    "common.error": "Something went wrong",
    "common.retry": "Retry",
    "common.cancel": "Cancel",
    "common.save": "Save",
    "common.close": "Close",
  },
  es: {
    // Voice
    "voice.title": "Habla con Xara",
    "voice.subtitle": "Inicia una conversación de voz con tu agente inmobiliario IA.",
    "voice.startCall": "Iniciar Llamada",
    "voice.endCall": "Finalizar Llamada",
    "voice.mute": "Silenciar",
    "voice.unmute": "Activar micrófono",
    "voice.connected": "Conectado",
    "voice.connecting": "Conectando...",
    "voice.disconnected": "Desconectado",
    "voice.signInRequired": "Inicia sesión para usar el modo de voz",
    "voice.transcriptionPlaceholder": "La transcripción aparecerá aquí...",
    "voice.listening": "Escuchando",
    "voice.thinking": "Pensando",
    "voice.speaking": "Hablando",
    "voice.viewInChat": "Ver en chat",
    "voice.tryAgain": "Intentar de nuevo",
    "voice.recordingConsent": "Consiento la grabación de la sesión para mejorar la calidad",

    // Navigation
    "nav.properties": "Propiedades",
    "nav.chat": "Chat",
    "nav.voice": "Voz",
    "nav.dashboard": "Panel",
    "nav.signIn": "Iniciar Sesión",

    // Common
    "common.loading": "Cargando...",
    "common.error": "Algo salió mal",
    "common.retry": "Reintentar",
    "common.cancel": "Cancelar",
    "common.save": "Guardar",
    "common.close": "Cerrar",
  },
} as const;

type Locale = keyof typeof dictionaries;
type TranslationKey = keyof (typeof dictionaries)["en"];

// --- Context ---

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
  availableLocales: readonly Locale[];
}

const I18nContext = createContext<I18nContextValue | null>(null);

// --- Provider ---

export function I18nProvider({
  children,
  defaultLocale = "en",
}: {
  children: ReactNode;
  defaultLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  const setLocale = useCallback((newLocale: Locale) => {
    if (dictionaries[newLocale]) {
      setLocaleState(newLocale);
      document.documentElement.lang = newLocale;
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => {
      const dict = dictionaries[locale];
      return (dict as Record<string, string>)[key] || key;
    },
    [locale]
  );

  return (
    <I18nContext.Provider
      value={{
        locale,
        setLocale,
        t,
        availableLocales: ["en", "es"] as const,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

// --- Hook ---

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Fallback for components outside provider
    return {
      locale: "en" as Locale,
      setLocale: () => {},
      t: (key: TranslationKey) => {
        return (dictionaries.en as Record<string, string>)[key] || key;
      },
      availableLocales: ["en", "es"] as const,
    };
  }
  return ctx;
}
