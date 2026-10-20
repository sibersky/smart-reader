// @teacher-alex-com/ui/src/components/LanguageSwitcher.tsx
import React, { useState, useEffect, useRef } from 'react';
import { ChevronDownIcon } from './icons/ChevronDownIcon'; // Use the new icon component

// Forward declare ImageComponent if you want to make it a prop,
// otherwise assume consuming app handles Next Image. For simplicity,
// this version will use a basic <img> tag and expect full URLs or public paths.
// If you need Next/Image optimization here, ImageComponent prop is better.

export interface LanguageOption {
  code: string;
  name: string; // Already translated name
  flag: string; // Path to flag, e.g., /assets/flags/gb.svg or full URL
}

export interface LanguageSwitcherProps {
  currentLocale: string;
  availableLanguages: LanguageOption[];
  onLanguageChange: (newLocale: string) => void;
  uiTexts: {
    selectLanguageLabel: string; // Translated "Select Language"
  };
  ImageComponent: React.ComponentType<{ // To allow Next/Image or basic <img>
    src: string;
    alt: string;
    width: number;
    height: number;
    className?: string;
    priority?: boolean;
  }>;
  className?: string; // Optional className for the container div
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  currentLocale,
  availableLanguages,
  onLanguageChange,
  uiTexts,
  ImageComponent, // Use the passed ImageComponent
  className = '',
}) => {
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const langSwitcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (langSwitcherRef.current && !langSwitcherRef.current.contains(event.target as Node)) {
        setIsLangDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [langSwitcherRef]);

  if (availableLanguages.length === 0) {
    return null;
  }

  const currentLangConfig = availableLanguages.find(lang => lang.code === currentLocale) || availableLanguages[0];

  if (!currentLangConfig) return null;

  const LanguageDropdownContent = () => (
    <div className="absolute right-0 mt-2 w-auto min-w-[8rem] bg-brand-100 dark:bg-brand-900 rounded-md shadow-xl py-1 origin-top-right z-50">
      {availableLanguages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => {
            onLanguageChange(lang.code);
            setIsLangDropdownOpen(false);
          }}
          className={`w-full text-left flex items-center px-3 py-2 text-sm ${
            currentLocale === lang.code
              ? 'bg-brand-200 dark:bg-brand-800 text-brand-700 dark:text-brand-200 font-semibold'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
          role="menuitem"
        >
          <div className="w-6 h-auto mr-2.5 flex-shrink-0">
            <ImageComponent
              src={lang.flag}
              alt={lang.name}
              width={24}
              height={18}
              className="rounded-sm"
            />
          </div>
          {lang.name}
        </button>
      ))}
    </div>
  );

  return (
    <div ref={langSwitcherRef} className={`relative ${className}`}>
      {/* Mobile Flag-only Button */}
      <div className="md:hidden">
        <button
          onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
          className="flex items-center justify-center p-1.5 bg-brand-100 hover:bg-white dark:bg-brand-800 dark:hover:bg-brand-700 rounded-md shadow-md focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
          aria-label={uiTexts.selectLanguageLabel}
          aria-haspopup="true"
          aria-expanded={isLangDropdownOpen}
        >
          <ImageComponent
            src={currentLangConfig.flag}
            alt={currentLangConfig.name}
            width={24}
            height={18}
            className="rounded-sm"
            priority
          />
        </button>
        {isLangDropdownOpen && <LanguageDropdownContent />}
      </div>

      {/* Desktop Flag + Name Button */}
      <div className="hidden md:block">
        <button
          onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
          className="flex items-center space-x-2 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 py-2 px-3 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
          aria-label={uiTexts.selectLanguageLabel}
          aria-haspopup="true"
          aria-expanded={isLangDropdownOpen}
        >
          <ImageComponent
            src={currentLangConfig.flag}
            alt={currentLangConfig.name}
            width={20}
            height={15}
            className="rounded-sm"
          />
          <span className="text-sm font-medium">{currentLangConfig.name}</span>
          <ChevronDownIcon className="w-5 h-5 text-gray-400 dark:text-gray-500" />
        </button>
        {isLangDropdownOpen && <LanguageDropdownContent />}
      </div>
    </div>
  );
};