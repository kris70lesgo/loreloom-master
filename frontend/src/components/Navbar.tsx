"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Settings01 as Settings } from "@untitledui/icons";

export function Navbar() {
  const pathname = usePathname();
  const isWorkspace = pathname?.startsWith("/workspace") || pathname?.startsWith("/dashboard");
  const isLandingPage = pathname === "/";
  if (isWorkspace || isLandingPage) return null;
  const isTransparentNav = isLandingPage;

  return (
    <motion.header
      className={isLandingPage ? "dark text-white" : ""}
      style={{
        ...styles.header,
        position: "fixed",
        backgroundColor: isTransparentNav ? "transparent" : "var(--card-bg)",
        borderBottom: isTransparentNav ? "none" : "1px solid var(--card-border)",
        backdropFilter: isTransparentNav ? "none" : "blur(20px)",
        WebkitBackdropFilter: isTransparentNav ? "none" : "blur(20px)",
      }}
    >
      <div className="container" style={styles.container}>
        {/* Left: Logo */}
        <div style={styles.left}>
          <Link href="/" style={styles.logoLink}>
            <span style={styles.logoText}>Loreloom</span>
            <div style={styles.glowingDot} />
          </Link>
        </div>

        {/* Center: Navigation (Removed for cleaner aesthetic) */}
        <nav style={styles.nav}></nav>

        {/* Right: CTA */}
        <div style={styles.right}>
          <Link href="/dashboard" style={{ textDecoration: 'none' }}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={styles.ctaButton}
            >
              <div style={styles.ctaButtonInner}>
                Go to Dashboard
              </div>
            </motion.button>
          </Link>
        </div>
      </div>
    </motion.header>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    zIndex: 100,
    borderBottom: "1px solid transparent",
    WebkitBackdropFilter: "blur(20px)",
  },
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    height: "var(--nav-height)",
    maxWidth: "1400px",
    margin: "0 auto",
    padding: "0 40px",
  },
  left: {
    display: "flex",
    flex: 1,
  },
  logoLink: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    textDecoration: "none",
    outline: "none",
    userSelect: "none",
    WebkitTapHighlightColor: "transparent",
  },
  logoText: {
    fontFamily: "var(--font-sans)",
    fontSize: "1.2rem",
    fontWeight: 600,
    letterSpacing: "-0.02em",
    color: "var(--text-primary)",
  },
  glowingDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: "var(--accent-purple)",
    boxShadow: "0 0 8px var(--accent-purple)",
    marginBottom: "2px", // aligns with baseline visually
  },
  nav: {
    display: "flex",
    flex: 2,
    justifyContent: "center",
    gap: "32px",
  },
  link: {
    fontFamily: "var(--font-sans)",
    fontSize: "0.9rem",
    fontWeight: 500,
    letterSpacing: "-0.01em",
    transition: "color 0.2s ease",
    textDecoration: "none",
  },
  right: {
    display: "flex",
    flex: 1,
    justifyContent: "flex-end",
  },
  loginButton: {
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "100px",
    padding: "8px 20px",
    color: "var(--text-secondary)",
    fontFamily: "var(--font-sans)",
    fontSize: "0.85rem",
    fontWeight: 500,
    cursor: "pointer",
    transition: "border-color 0.2s, color 0.2s",
  },
  ctaButton: {
    background: "linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))",
    padding: "1px", // for gradient border thickness
    borderRadius: "100px",
    border: "none",
    cursor: "pointer",
    boxShadow: "0 4px 15px rgba(176, 38, 255, 0.2)",
  },
  ctaButtonInner: {
    background: "rgba(10, 10, 12, 0.9)",
    borderRadius: "100px",
    padding: "8px 20px",
    color: "#fff",
    fontFamily: "var(--font-sans)",
    fontSize: "0.85rem",
    fontWeight: 600,
    letterSpacing: "0.02em",
    backdropFilter: "blur(10px)",
  }
};
