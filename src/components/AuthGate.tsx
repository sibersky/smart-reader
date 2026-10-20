// src/components/AuthGate.tsx
import React from 'react';
import { useTranslation } from '@/lib/i18n';

interface AuthGateProps {
  accountUrl: string;
}

export const AuthGate: React.FC<AuthGateProps> = ({ accountUrl }) => {
  const { t } = useTranslation();

  const getCallbackUrl = () => {
    if (typeof window !== 'undefined') {
      return encodeURIComponent(window.location.href);
    }
    return encodeURIComponent('https://www.teacher-alex.com/smart_reader');
  };

  const loginUrl = `${accountUrl}/login?callbackUrl=${getCallbackUrl()}`;
  const signUpUrl = `${accountUrl}/register?callbackUrl=${getCallbackUrl()}`;

  return (
    <div className="max-w-2xl mx-auto my-12 p-8 sm:p-10 bg-white rounded-2xl border border-brand-200 shadow-sm text-center">
      <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-brand-50 border border-brand-200 flex items-center justify-center text-3xl select-none">
        📖
      </div>

      <span className="text-xs font-semibold text-brand-600 uppercase tracking-wider mb-2 block">
        Teacher Alex Learning Suite
      </span>

      <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-900 tracking-tight mb-3">
        {t.authGate.title}
      </h1>

      <p className="text-sm text-text-secondary leading-relaxed max-w-lg mx-auto mb-8">
        {t.authGate.description}
      </p>

      <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
        <a
          href={loginUrl}
          className="w-full sm:w-auto px-7 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm transition-colors shadow-sm text-center cursor-pointer"
        >
          {t.authGate.loginButton}
        </a>

        <a
          href={signUpUrl}
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-neutral-50 hover:bg-neutral-100 text-text-primary font-medium text-sm border border-neutral-300 transition-colors text-center cursor-pointer"
        >
          {t.authGate.signUpButton}
        </a>
      </div>
    </div>
  );
};
