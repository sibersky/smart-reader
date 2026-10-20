// @teacher-alex-com/ui/src/components/Header.tsx
import React, { useState } from 'react';
export const MAIN_NAVIGATION_LINKS: NavLink[] = [
  { name: "Courses", href: "/courses" },
  { name: "About", href: "/about" },
  { name: "Contact", href: "/contact" },
];
// Make sure LSwitcherProps is also exported from LanguageSwitcher.tsx or defined/imported here
import { LanguageSwitcher, LanguageSwitcherProps as LSwitcherPropsImport } from './LanguageSwitcher';

// --- Type Definitions ---
export interface NavLink { // Exporting this interface directly
  name: string;
  href: string;
}

// Define a specific type for the language switcher props needed by Header
// This makes it clear what the Header expects.
export type HeaderLanguageSwitcherConfig = Pick< // Renamed slightly for clarity if needed, or keep as is
  LSwitcherPropsImport,
  'currentLocale' | 'availableLanguages' | 'onLanguageChange' | 'uiTexts' | 'ImageComponent'
>;

export interface HeaderProps { // Exporting this interface directly
  logoSrc: string;
  logoWidth?: number;
  logoHeight?: number;
  siteBaseUrl?: string;
  isLoggedIn: boolean;
  accountUrlBase: string;
  currentToolName?: string;
  currentToolBaseUrl?: string;
  navLinks?: NavLink[];
  className?: string;
  LogoComponent: React.ComponentType<{
    src: string;
    alt: string;
    width: number;
    height: number;
    className?: string;
    priority?: boolean;
  }>;
  languageSwitcherConfig?: HeaderLanguageSwitcherConfig; // Use the exported type
}
// --- End Type Definitions ---

const Header: React.FC<HeaderProps> = ({
  logoSrc,
  logoWidth = 32,
  logoHeight = 32,
  siteBaseUrl = '/',
  isLoggedIn,
  accountUrlBase,
  currentToolName,
  currentToolBaseUrl,
  navLinks = MAIN_NAVIGATION_LINKS,
  className = '',
  LogoComponent,
  languageSwitcherConfig,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const currentLang = languageSwitcherConfig?.currentLocale || "ru";
  const authLabels = {
    ru: { profile: "Профиль", logout: "Выйти", login: "Войти", signUp: "Регистрация" },
    es: { profile: "Perfil", logout: "Cerrar sesión", login: "Iniciar sesión", signUp: "Registrarse" },
    en: { profile: "Profile", logout: "Logout", login: "Login", signUp: "Sign Up" },
  }[currentLang as "ru" | "es" | "en"] || { profile: "Profile", logout: "Logout", login: "Login", signUp: "Sign Up" };


  const baseStyle = `bg-[color:var(--color-brand-300)] border-b border-border-primary shadow-sm`;
  const containerStyle = `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`;
  const contentStyle = `flex justify-between items-center h-16`;
  const linkStyle = `text-sm font-medium text-neutral-900 hover:text-brand-900 transition-colors`;
  const logoLinkStyle = `flex items-center flex-shrink-0`;
  const mobileLinkStyle = `block px-3 py-2 rounded-md text-base font-medium text-neutral-900 hover:text-brand-900 hover:bg-[color:var(--color-brand-200)]`;

  return (
    <nav className={`${baseStyle} ${className}`}>
      <div className={containerStyle}>
        <div className={contentStyle}>
          {/* Left Section */}
          <div className="flex items-center space-x-4 md:space-x-6 -ml-2 h-full">
            <a href={siteBaseUrl} className={`${logoLinkStyle} h-full`} aria-label="Homepage">
              <div className="relative h-full w-auto flex items-center">
                <LogoComponent
                  src={logoSrc}
                  alt="Site Logo"
                  width={logoWidth}
                  height={logoHeight}
                  className="object-contain h-[60%] sm:h-[70%] lg:h-[80%] max-w-full"
                  priority={true}
                />
              </div>
            </a>
            {currentToolName && currentToolBaseUrl && (
              <>
                <span className="text-neutral-800 hidden md:inline">/</span>
                <a href={currentToolBaseUrl} className={`${linkStyle} hidden md:inline`}>
                  {currentToolName}
                </a>
              </>
            )}
            {navLinks.length > 0 && (
              <div className="hidden md:flex items-center space-x-4 pl-6 ml-6 border-l border-border-secondary">
                {navLinks.map((link) => (
                  <a key={link.name} href={link.href} className={linkStyle}>
                    {link.name}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-3">
            {languageSwitcherConfig && (
              <LanguageSwitcher
                {...languageSwitcherConfig}
              />
            )}

            <div className="hidden md:flex items-center space-x-4">
              {isLoggedIn ? (
                <>
                  <a href={`${accountUrlBase}/settings/profile`} className={linkStyle}>{authLabels.profile}</a>
                  <a href={`${accountUrlBase}/auth/logout`} className={linkStyle}>{authLabels.logout}</a>
                </>
              ) : (
                <>
                  <a href={`${accountUrlBase}/auth/login`} className={linkStyle}>{authLabels.login}</a>
                  <a href={`${accountUrlBase}/auth/register`} className={linkStyle}>{authLabels.signUp}</a>
                </>
              )}
            </div>

            <div className="md:hidden flex items-center">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                type="button"
                className="inline-flex items-center justify-center p-2 rounded-md text-neutral-700 hover:text-neutral-900 hover:bg-[color:var(--color-brand-200)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500"
                aria-controls="mobile-menu"
                aria-expanded={isMobileMenuOpen}
              >
                <span className="sr-only">Open main menu</span>
                {isMobileMenuOpen ? (
                  <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                ) : (
                  <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" /></svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden" id="mobile-menu">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navLinks.map((link) => (
              <a key={`mobile-${link.name}`} href={link.href} className={mobileLinkStyle}>{link.name}</a>
            ))}
          </div>
          <div className="pt-4 pb-3 border-t border-[color:var(--color-brand-200)]">
            <div className="px-2 space-y-1">
              {isLoggedIn ? (
                <>
                  <a href={`${accountUrlBase}/settings/profile`} className={mobileLinkStyle}>{authLabels.profile}</a>
                  <a href={`${accountUrlBase}/auth/logout`} className={mobileLinkStyle}>{authLabels.logout}</a>
                </>
              ) : (
                <>
                  <a href={`${accountUrlBase}/auth/login`} className={mobileLinkStyle}>{authLabels.login}</a>
                  <a href={`${accountUrlBase}/auth/register`} className={mobileLinkStyle}>{authLabels.signUp}</a>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Header;
// No need to re-export HeaderProps, NavLink, HeaderLanguageSwitcherConfig here as they are already exported above.

// No need to re-export HeaderProps, NavLink, HeaderLanguageSwitcherConfig here as they are already exported above.

// // src/components/Header.tsx
// import React from 'react';
// import { MAIN_NAVIGATION_LINKS } from '../config/navigation';

// // --- Type Definitions ---
// interface NavLink {
//   name: string;
//   href: string;
// }

// interface HeaderProps {
//   logoSrc: string;
//   logoWidth?: number;
//   logoHeight?: number;
//   siteBaseUrl?: string;
//   isLoggedIn: boolean;
//   accountUrlBase: string; // Base URL for the account app (https://account.teacher-alex.com)
//   currentToolName?: string;
//   currentToolBaseUrl?: string;
//   navLinks?: NavLink[];
//   className?: string;
//   // Component passed in to render the logo (e.g., next/image)
//   LogoComponent: React.ComponentType<{
//     src: string;
//     alt: string;
//     width: number;
//     height: number;
//     className?: string;
//     priority?: boolean;
//   }>;
// }
// // --- End Type Definitions ---

// const Header: React.FC<HeaderProps> = ({
//   logoSrc,
//   logoWidth = 32, // Default width
//   logoHeight = 32, // Default height
//   siteBaseUrl = '/',
//   isLoggedIn, // Received from consuming app
//   accountUrlBase,
//   currentToolName,
//   currentToolBaseUrl,
//   navLinks = MAIN_NAVIGATION_LINKS,
//   className = '',
//   LogoComponent,
// }) => {
//   // --- Tailwind Styles ---
//   const baseStyle = `bg-[color:var(--color-brand-300)] border-b border-border-primary shadow-sm`;
//   const containerStyle = `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`;
//   const contentStyle = `flex justify-between items-center h-16`;
//   const linkStyle = `text-sm font-medium text-neutral-900 hover:text-brand-900 transition-colors`;
//   const logoLinkStyle = `flex items-center flex-shrink-0`;
//   // --- End Tailwind Styles ---

//   return (
//     <nav className={`${baseStyle} ${className}`}>
//       <div className={containerStyle}>
//         <div className={contentStyle}>
//           {/* --- Left Section --- */}
//           <div className="flex items-center space-x-4 md:space-x-6 -ml-2 h-full">
//             <a href={siteBaseUrl} className={`${logoLinkStyle} h-full`} aria-label="Homepage">
//               <div className="relative h-full w-auto flex items-center">
//                 <LogoComponent
//                   src={logoSrc}
//                   alt="Site Logo"
//                   width={logoWidth}   // Intrinsic width for Image component
//                   height={logoHeight}  // Intrinsic height for Image component
//                   className="object-contain h-[60%] sm:h-[70%] lg:h-[80%] max-w-full"
//                   priority={true}
//                 />
//               </div>
//             </a>
//             {/* Tool Name */}
//             {currentToolName && currentToolBaseUrl && (
//               <>
//                 <span className="text-neutral-800">/</span>
//                 <a href={currentToolBaseUrl} className={linkStyle}>
//                   {currentToolName}
//                 </a>
//               </>
//             )}
//             {/* Main Navigation */}
//             {navLinks.length > 0 && (
//               <div className="hidden md:flex items-center space-x-4 pl-6 ml-6 border-l border-border-secondary">
//                 {navLinks.map((link) => (
//                   <a key={link.name} href={link.href} className={linkStyle}>
//                     {link.name}
//                   </a>
//                 ))}
//               </div>
//             )}
//           </div>
//           {/* --- End Left Section --- */}

//           {/* --- Right Section: Account Actions (Uses isLoggedIn) --- */}
//           <div className="flex items-center space-x-4">
//             {isLoggedIn ? (
//               // Rendered if isLoggedIn is true
//               <>
//                 <a href={`${accountUrlBase}/settings/profile`} className={linkStyle}>
//                   Profile
//                 </a>
//                 <a href={`${accountUrlBase}/auth/logout`} className={linkStyle}>
//                   Logout
//                 </a>
//               </>
//             ) : (
//               // Rendered if isLoggedIn is false
//               <>
//                 <a href={`${accountUrlBase}/auth/login`} className={linkStyle}>
//                   Login
//                 </a>
//                 <a href={`${accountUrlBase}/auth/register`} className={linkStyle}>
//                   Sign Up
//                 </a>
//               </>
//             )}
//           </div>
//           {/* --- End Right Section --- */}
//         </div>
//       </div>
//     </nav>
//   );
// };

// export default Header;
// export type { HeaderProps, NavLink };