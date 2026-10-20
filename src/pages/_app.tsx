// src/pages/_app.tsx
import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { GoogleAnalytics, usePageViews } from 'nextjs-google-analytics';
import Layout from '@/components/layout/Layout';
import { I18nProvider } from '@/lib/i18n';

export default function App({ Component, pageProps }: AppProps) {
  const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const isProduction = process.env.NODE_ENV === 'production';

  usePageViews();

  return (
    <I18nProvider>
      {isProduction && gaMeasurementId && (
        <GoogleAnalytics gaMeasurementId={gaMeasurementId} trackPageViews />
      )}
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </I18nProvider>
  );
}
