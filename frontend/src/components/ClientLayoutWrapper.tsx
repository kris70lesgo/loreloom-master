"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "./Navbar";

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isWorkspace = pathname?.startsWith("/workspace");
  const isDashboard = pathname?.startsWith("/dashboard");
  const isAuthRoute = pathname?.startsWith("/login") || pathname?.startsWith("/signup");

  const isLandingPage = pathname === "/";

  if (isWorkspace || isDashboard || isAuthRoute || isLandingPage) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      <main data-loreloom-shell-main style={styles.main}>
        {children}
      </main>
      <footer data-loreloom-shell-footer style={styles.footer}>
        <div style={styles.footerContainer}>
          <div style={styles.footerLeft}>
            <span className="title-cyber" style={styles.footerLogo}>LORELOOM</span>
            <p style={styles.footerDesc}>AI Art Director for Visual Stories & On-Chain Provenance.</p>
          </div>
          <div style={styles.footerRight}>
            <span className="badge badge-gray" style={styles.footerContract}>
              Contract: 0x9a8F...e10C
            </span>
            <p style={styles.copyright}>© 2026 Loreloom. Creative Commons AI Attribution License.</p>
          </div>
        </div>
      </footer>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    flex: 1,
    paddingTop: "var(--nav-height)",
    display: "flex",
    flexDirection: "column"
  },
  footer: {
    background: "var(--background)",
    borderTop: "1px solid var(--card-border)",
    padding: "32px 0",
    marginTop: "auto",
  },
  footerContainer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "24px",
    width: "100%",
    padding: "0 40px",
    boxSizing: "border-box"
  },
  footerLeft: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  footerLogo: {
    fontSize: "1rem",
    fontWeight: 700,
    letterSpacing: "0.1em",
    color: "var(--text-secondary)",
  },
  footerDesc: {
    fontSize: "0.85rem",
    color: "var(--text-muted)",
  },
  footerRight: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "8px",
  },
  footerContract: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.7rem",
  },
  copyright: {
    fontSize: "0.8rem",
    color: "var(--text-muted)",
  },
};
