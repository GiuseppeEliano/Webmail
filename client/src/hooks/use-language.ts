import { useState, useEffect } from 'react';
import { getCurrentLanguage, t } from '@/lib/i18n';

export function useLanguage() {
  const [currentLanguage, setCurrentLanguage] = useState(getCurrentLanguage());

  useEffect(() => {
    const handleLanguageChange = (event: CustomEvent) => {
      setCurrentLanguage(event.detail);
    };

    window.addEventListener('languageChange', handleLanguageChange as EventListener);
    
    return () => {
      window.removeEventListener('languageChange', handleLanguageChange as EventListener);
    };
  }, []);

  return {
    currentLanguage,
    t: (key: string, params?: Record<string, any>) => t(key, params)
  };
}