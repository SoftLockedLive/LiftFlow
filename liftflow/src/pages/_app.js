import { useEffect } from "react";
import { Geist } from "next/font/google";
import ErrorBoundary from "../components/ErrorBoundary";
import Layout from "../components/Layout";
import "../styles/globals.css";

// Self-hosted at build time; no request goes to Google from the browser.
const geist = Geist({ subsets: ["latin"] });

export default function App({ Component, pageProps }) {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return (
    <>
      <style jsx global>{`
        :root {
          --font-sans: ${geist.style.fontFamily};
        }
      `}</style>
      <ErrorBoundary>
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </ErrorBoundary>
    </>
  );
}
