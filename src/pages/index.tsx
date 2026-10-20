// src/pages/index.tsx
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useTranslation } from '@/lib/i18n';
import { AuthGate } from '@/components/AuthGate';
import { ReaderInput } from '@/components/ReaderInput';
import { InteractiveReader } from '@/components/InteractiveReader';
import { AnalyzeResult } from './api/reader/analyze';

export default function SmartReaderPage() {
  const { t } = useTranslation();
  const accountAppUrl =
    process.env.NEXT_PUBLIC_ACCOUNT_HUB_URL || 'https://account.teacher-alex.com';

  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [demoBypass, setDemoBypass] = useState(false);

  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(null);
  const [currentLevel, setCurrentLevel] = useState<string>('B1');
  const [currentL1, setCurrentL1] = useState<string>('Russian');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // SSO Session check
  useEffect(() => {
    let isMounted = true;
    fetch(`${accountAppUrl}/api/auth/sso-status`, {
      credentials: 'include',
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted) {
          setIsLoggedIn(Boolean(data?.isLoggedIn));
          setIsLoadingAuth(false);
        }
      })
      .catch((err) => {
        console.warn('SSO check error:', err);
        if (isMounted) {
          setIsLoggedIn(false);
          setIsLoadingAuth(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [accountAppUrl]);

  // Handle analyze trigger from ReaderInput
  const handleAnalyze = async (payload: {
    text?: string;
    imageBase64?: string;
    imageMimeType?: string;
    targetLevel: string;
    l1Language: string;
  }) => {
    setIsAnalyzing(true);
    setErrorMessage(null);
    setCurrentLevel(payload.targetLevel);
    setCurrentL1(payload.l1Language);

    try {
      const res = await fetch('/smart_reader/api/reader/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.details || json.error || 'Failed to analyze text');
      }

      setAnalyzeResult(json.data);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Analysis failed:', err);
      setErrorMessage(
        error?.message || 'An error occurred while analyzing vocabulary. Please try again.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setAnalyzeResult(null);
    setErrorMessage(null);
  };

  const isUserAuthenticated = isLoggedIn || demoBypass;

  return (
    <>
      <Head>
        <title>{t.reader.title}</title>
        <meta name="description" content={t.reader.subtitle} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/smart_reader/favicon.ico" />
      </Head>

      <div className="w-full max-w-4xl mx-auto py-2 sm:py-6">
        {/* Loading state for SSO */}
        {isLoadingAuth ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-4" />
            <p className="text-sm font-medium text-text-secondary">
              {t.authGate.checkingAuth}
            </p>
          </div>
        ) : !isUserAuthenticated ? (
          /* Registered Users Gate */
          <div>
            <AuthGate accountUrl={accountAppUrl} />
            {/* Quick Demo Preview Option for testing */}
            <div className="text-center mt-6">
              <button
                type="button"
                onClick={() => setDemoBypass(true)}
                className="text-xs text-brand-700 hover:text-brand-900 font-semibold underline cursor-pointer"
              >
                ⚡ Preview Smart Reader in Demo Mode
              </button>
            </div>
          </div>
        ) : (
          /* Authenticated Smart Reader Experience */
          <div>
            {!analyzeResult ? (
              <div className="space-y-6">
                {/* Hero Header */}
                <div className="text-center max-w-2xl mx-auto mb-8">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-100 text-brand-800 text-xs font-bold tracking-wide uppercase mb-3">
                    ✨ {t.reader.badge}
                  </span>
                  <h1 className="text-2xl sm:text-4xl font-black text-brand-900 tracking-tight mb-3">
                    {t.reader.heading}
                  </h1>
                  <p className="text-sm sm:text-base text-text-secondary leading-relaxed">
                    {t.reader.subtitle}
                  </p>
                </div>

                {/* Error Banner if any */}
                {errorMessage && (
                  <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between mb-4">
                    <div>
                      <strong className="font-bold">{t.reader.errorTitle}: </strong>
                      <span>{errorMessage}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setErrorMessage(null)}
                      className="ml-4 font-bold hover:underline cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Input Form (Text or Screenshot + Level & L1) */}
                <ReaderInput
                  onAnalyze={handleAnalyze}
                  isLoading={isAnalyzing}
                />
              </div>
            ) : (
              /* Interactive Reader Display */
              <InteractiveReader
                data={analyzeResult}
                targetLevel={currentLevel}
                l1Language={currentL1}
                onReset={handleReset}
              />
            )}
          </div>
        )}
      </div>
    </>
  );
}
