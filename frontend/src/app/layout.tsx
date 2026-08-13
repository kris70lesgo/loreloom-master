import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { StoryProvider } from "../context/StoryContext";
import ClientLayoutWrapper from "../components/ClientLayoutWrapper";

import { ThemeProvider } from "../components/ThemeProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Loreloom | AI-Powered Living Archive of Karnataka",
  description: "Explore heritage, folklore, monuments, traditions and forgotten stories of Karnataka through immersive AI-powered storytelling with on-chain cultural provenance.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${inter.variable}`} suppressHydrationWarning={true} data-scroll-behavior="smooth">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Suppress benign errors from browser extensions (MetaMask, etc.)
                var originalError = window.onerror;
                window.onerror = function(msg, url, line, col, err) {
                  if (url && (url.indexOf('chrome-extension://') !== -1 || url.indexOf('moz-extension://') !== -1)) {
                    return true;
                  }
                  if (typeof msg === 'string' && (msg.indexOf('MetaMask') !== -1 || msg.indexOf('metamask') !== -1)) {
                    return true;
                  }
                  return originalError ? originalError.apply(this, arguments) : false;
                };
                window.addEventListener('unhandledrejection', function(e) {
                  if (e.reason && typeof e.reason === 'object' && e.reason.message && e.reason.message.indexOf('MetaMask') !== -1) {
                    e.preventDefault();
                  }
                });
              })();
            `
          }}
        />
      </head>
      <body style={{ margin: 0, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
          <StoryProvider>
            <ClientLayoutWrapper>
              {children}
            </ClientLayoutWrapper>
          </StoryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
