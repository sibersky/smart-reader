// src/components/layout/Layout.tsx
import React, { useState, useEffect } from 'react';
import Header from './Header';
import Footer from './Footer';
import Image from 'next/image';
import { useTranslation, Locale } from '@/lib/i18n';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const logoPath = "/smart_reader/assets/logo.png";
  const accountAppUrl = process.env.NEXT_PUBLIC_ACCOUNT_HUB_URL || "https://account.teacher-alex.com";
  const siteBaseUrl = "/";
  const siteStartYear = 2025;
  const siteName = "Teacher Alex";
  const headerLogoWidth = 40;
  const headerLogoHeight = 40;
  const toolName = "Smart Reader";
  const toolBaseUrl = "/smart_reader";

  const { locale, setLocale, t } = useTranslation();

  // Dynamic SSO login state check
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    let isMounted = true;
    fetch(`${accountAppUrl}/api/auth/sso-status`, {
      credentials: 'include',
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted) {
          setIsLoggedIn(Boolean(data?.isLoggedIn));
        }
      })
      .catch((err) => {
        console.warn("Could not check SSO session status:", err);
        if (isMounted) setIsLoggedIn(false);
      });

    return () => {
      isMounted = false;
    };
  }, [accountAppUrl]);

  const languageSwitcherConfig = {
    currentLocale: locale,
    availableLanguages: [
      { code: "ru", name: "Русский", flag: "🇷🇺" },
      { code: "en", name: "English", flag: "🇬🇧" },
      { code: "es", name: "Español", flag: "🇪🇸" },
    ],
    onLanguageChange: (newLocale: string) => setLocale(newLocale as Locale),
    uiTexts: {
      selectLanguageLabel: locale === "ru" ? "Выбрать язык" : "Select Language",
    },
    ImageComponent: ({ src }: { src: string }) => (
      <span className="text-base leading-none select-none mr-1.5">{src}</span>
    ),
  };

  return (
    <div className="flex flex-col min-h-screen bg-brand-200">
      <Header
        logoSrc={logoPath}
        siteBaseUrl={siteBaseUrl}
        isLoggedIn={isLoggedIn}
        accountUrlBase={accountAppUrl}
        currentToolName={toolName}
        currentToolBaseUrl={toolBaseUrl}
        LogoComponent={Image}
        logoWidth={headerLogoWidth}
        logoHeight={headerLogoHeight}
        languageSwitcherConfig={languageSwitcherConfig}
        navLinks={[
          { name: t.nav.courses, href: "/courses" },
          { name: t.nav.about, href: "/about" },
          { name: t.nav.contact, href: "/contact" },
        ]}
      />
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <Footer siteName={siteName} startYear={siteStartYear} />
    </div>
  );
};

export default Layout;
