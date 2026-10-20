import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  const basePath = "/smart_reader";

  return (
    <Html lang="en">
      <Head>
        <link rel="icon" type="image/png" href={`${basePath}/favicon-96x96.png`} sizes="96x96" />
        <link rel="icon" type="image/svg+xml" href={`${basePath}/favicon.svg`} />
        <link rel="shortcut icon" href={`${basePath}/favicon.ico`} />
        <link rel="apple-touch-icon" sizes="180x180" href={`${basePath}/apple-touch-icon.png`} />
        <link rel="manifest" href={`${basePath}/site.webmanifest`} />
        <meta name="msapplication-TileColor" content="#da532c"></meta>
        <meta name="theme-color" content="#ffffff"></meta>
      </Head>
      <body className="antialiased"> 
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
