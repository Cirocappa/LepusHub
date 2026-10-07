import React, { createContext, useContext, useState, useEffect } from "react";
import { Language, TranslationDict, translations } from "../translations";

interface LanguageContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof TranslationDict) => string;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("lepushub_language");
    return (saved === "es" || saved === "en") ? saved : "en";
  });

  const setLanguage = (lang: Language) => {
    localStorage.setItem("lepushub_language", lang);
    setLanguageState(lang);
  };

  const t = (key: keyof TranslationDict): string => {
    const dict = translations[language];
    return dict[key] || translations["en"][key] || String(key);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
