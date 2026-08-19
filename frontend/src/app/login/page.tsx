"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { login, signup } from "./actions";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  // Read URL params for errors
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    if (error) {
      setErrorMsg(error);
    }
    if (params.get("mode") === "signup") {
      setIsLogin(false);
    }
  }, []);

  const handleGoogleLogin = async () => {
    setLoadingGoogle(true);
    const supabase = createClient();
    const params = new URLSearchParams(window.location.search);
    const redirectTo = params.get("redirectTo") || params.get("redirect") || "/dashboard";
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
      },
    });

    if (error) {
      setErrorMsg(error.message);
      setLoadingGoogle(false);
    }
  };

  const onSubmit = () => {
    setLoading(true);
    setErrorMsg(null);
  };

  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const redirectTo = params?.get("redirectTo") || params?.get("redirect") || "/dashboard";

  return (
    <div style={styles.pageContainer}>
      <style>{`
        .primary-btn {
          width: 100%;
          padding: 12px 18px;
          border-radius: 8px;
          background-color: #7F56D9;
          border: 1px solid #7F56D9;
          color: #ffffff;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          margin-top: 8px;
          box-shadow: 0px 1px 2px rgba(16, 24, 40, 0.05);
          transition: background-color 0.15s ease-in-out, border-color 0.15s ease-in-out;
        }
        .primary-btn:hover:not(:disabled) {
          background-color: #6941C6;
          border-color: #6941C6;
        }
        .primary-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .social-btn {
          width: 100%;
          padding: 12px 16px;
          border-radius: 8px;
          background-color: #FFFFFF;
          border: 1px solid #D0D5DD;
          color: #344054;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          box-shadow: 0px 1px 2px rgba(16, 24, 40, 0.05);
          transition: background-color 0.15s ease-in-out, border-color 0.15s ease-in-out;
        }
        .social-btn:hover:not(:disabled) {
          background-color: #F9FAFB;
          border-color: #D0D5DD;
        }
        .social-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .input-field {
          width: 100%;
          padding: 10px 14px;
          border-radius: 8px;
          background-color: #FFFFFF;
          border: 1px solid #D0D5DD;
          color: #101828;
          font-size: 0.95rem;
          outline: none;
          box-shadow: 0px 1px 2px rgba(16, 24, 40, 0.05);
          transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
          box-sizing: border-box;
        }
        .input-field:focus {
          border-color: #D6BBFB;
          box-shadow: 0px 1px 2px rgba(16, 24, 40, 0.05), 0px 0px 0px 4px #F4EBFF;
        }
        .input-field::placeholder {
          color: #667085;
        }
      `}</style>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={styles.card}
      >
        <div style={styles.logoContainer}>
          <Link href="/">
            <svg width="32" height="32" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0px 1px 2px rgba(16, 24, 40, 0.05))' }}>
              <g filter="url(#sidebar_logo_filter0)">
                <g clipPath="url(#sidebar_logo_clip0)">
                  <rect width="48" height="48" rx="12" fill="#0A0A0A"/>
                  <rect width="48" height="48" fill="url(#sidebar_logo_paint0)"/>
                  <g filter="url(#sidebar_logo_filter1)">
                    <path d="M9 12.75C9 10.6789 10.6789 9 12.75 9H20.25C22.3211 9 24 10.6789 24 12.75V20.1144C24.0002 20.1594 24.0003 20.2046 24.0003 20.25C24.0003 22.3181 25.6744 23.9952 27.7413 24C27.7442 24 27.7471 24 27.75 24H35.25C37.3211 24 39 25.6789 39 27.75V35.25C39 37.3211 37.3211 39 35.25 39H27.75C25.6789 39 24 37.3211 24 35.25V27.75C24 27.7396 24 27.7292 24.0001 27.7188C23.9834 25.6621 22.3109 24 20.2503 24C20.2406 24 20.2309 24 20.2212 24H12.75C10.6789 24 9 22.3211 9 20.25V12.75Z" fill="url(#sidebar_logo_paint1)"/>
                  </g>
                </g>
                <rect x="1" y="1" width="46" height="46" rx="11" stroke="url(#sidebar_logo_paint2)" strokeWidth="2"/>
              </g>
              <defs>
                <filter id="sidebar_logo_filter0" x="0" y="-3" width="48" height="54" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                  <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                  <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                  <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                  <feOffset dy="-3"/>
                  <feGaussianBlur stdDeviation="1.5"/>
                  <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
                  <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"/>
                  <feBlend mode="normal" in2="shape" result="effect1_innerShadow"/>
                  <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                  <feOffset dy="3"/>
                  <feGaussianBlur stdDeviation="1.5"/>
                  <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
                  <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.1 0"/>
                  <feBlend mode="normal" in2="effect1_innerShadow" result="effect2_innerShadow"/>
                  <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                  <feMorphology radius="1" operator="erode" in="SourceAlpha" result="effect3_innerShadow"/>
                  <feOffset/>
                  <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
                  <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.2 0"/>
                  <feBlend mode="normal" in2="effect2_innerShadow" result="effect3_innerShadow"/>
                </filter>
                <filter id="sidebar_logo_filter1" x="6" y="5.25" width="36" height="42" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                  <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                  <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                  <feMorphology radius="1.5" operator="erode" in="SourceAlpha" result="effect1_dropShadow"/>
                  <feOffset dy="2.25"/>
                  <feGaussianBlur stdDeviation="2.25"/>
                  <feComposite in2="hardAlpha" operator="out"/>
                  <feColorMatrix type="matrix" values="0 0 0 0 0.141176 0 0 0 0 0.141176 0 0 0 0 0.141176 0 0 0 0.1 0"/>
                  <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow"/>
                  <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape"/>
                </filter>
                <linearGradient id="sidebar_logo_paint0" x1="24" y1="0" x2="26" y2="48" gradientUnits="userSpaceOnUse">
                  <stop stopColor="white" stopOpacity="0"/>
                  <stop offset="1" stopColor="white" stopOpacity="0.12"/>
                </linearGradient>
                <linearGradient id="sidebar_logo_paint1" x1="24" y1="9" x2="24" y2="39" gradientUnits="userSpaceOnUse">
                  <stop stopColor="white" stopOpacity="0.8"/>
                  <stop offset="1" stopColor="white" stopOpacity="0.5"/>
                </linearGradient>
                <linearGradient id="sidebar_logo_paint2" x1="24" y1="0" x2="24" y2="48" gradientUnits="userSpaceOnUse">
                  <stop stopColor="white" stopOpacity="0.12"/>
                  <stop offset="1" stopColor="white" stopOpacity="0"/>
                </linearGradient>
                <clipPath id="sidebar_logo_clip0">
                  <rect width="48" height="48" rx="12" fill="white"/>
                </clipPath>
              </defs>
            </svg>
          </Link>
        </div>

        <h1 style={styles.title}>
          {isLogin ? "Sign in to Loreloom" : "Create an account"}
        </h1>
        <p style={styles.subtitle}>
          {isLogin ? "Welcome back to your worlds." : "Start your visual storytelling journey."}
        </p>

        {errorMsg && (
          <div style={styles.errorContainer}>
            {errorMsg}
          </div>
        )}

        <form action={isLogin ? login : signup} onSubmit={onSubmit} style={styles.form}>
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <div style={styles.inputGroup}>
            <label htmlFor="email" style={styles.label}>Email</label>
            <input 
              type="email" 
              name="email" 
              id="email" 
              placeholder="Enter your email" 
              required 
              className="input-field"
            />
          </div>

          <div style={styles.inputGroup}>
            <label htmlFor="password" style={styles.label}>Password</label>
            <input 
              type="password" 
              name="password" 
              id="password" 
              placeholder="••••••••" 
              required 
              className="input-field"
            />
          </div>

          <button type="submit" disabled={loading} className="primary-btn">
            {loading ? "Processing..." : (isLogin ? "Sign In" : "Get started")}
          </button>
        </form>

        <div style={styles.dividerContainer}>
          <div style={styles.dividerLine} />
          <span style={styles.dividerText}>OR</span>
          <div style={styles.dividerLine} />
        </div>

        <div style={styles.socialButtonsContainer}>
          <button 
            type="button" 
            onClick={handleGoogleLogin} 
            disabled={loadingGoogle}
            className="social-btn"
          >
            <svg style={styles.socialIcon} viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {loadingGoogle ? "Connecting..." : (isLogin ? "Sign in with Google" : "Sign up with Google")}
          </button>
        </div>

        <div style={styles.footer}>
          {isLogin ? (
            <>
              Don't have an account?{" "}
              <button 
                type="button" 
                onClick={() => setIsLogin(false)} 
                style={styles.switchBtn}
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button 
                type="button" 
                onClick={() => setIsLogin(true)} 
                style={styles.switchBtn}
              >
                Log in
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pageContainer: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    position: "relative",
    overflow: "hidden",
    fontFamily: "var(--font-sans)",
  },
  card: {
    width: "100%",
    maxWidth: "360px",
    padding: "0px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    position: "relative",
    zIndex: 10,
  },
  logoContainer: {
    marginBottom: "24px",
  },
  logoWrapper: {
    width: "48px",
    height: "48px",
    borderRadius: "12px",
    border: "1px solid #EAECF0",
    backgroundColor: "#FFFFFF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0px 1px 2px rgba(16, 24, 40, 0.05)",
  },
  title: {
    fontSize: "1.875rem",
    fontWeight: 600,
    color: "#101828",
    margin: "0 0 8px 0",
    letterSpacing: "-0.02em",
    textAlign: "center",
  },
  subtitle: {
    fontSize: "1rem",
    color: "#667085",
    margin: "0 0 32px 0",
    textAlign: "center",
  },
  errorContainer: {
    width: "100%",
    padding: "12px",
    marginBottom: "24px",
    borderRadius: "8px",
    backgroundColor: "#FEF3C7",
    border: "1px solid #FDE68A",
    color: "#92400E",
    fontSize: "0.875rem",
    textAlign: "center",
  },
  form: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "0.875rem",
    fontWeight: 500,
    color: "#344054",
  },
  dividerContainer: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    margin: "24px 0",
    gap: "16px",
  },
  dividerLine: {
    flex: 1,
    height: "1px",
    background: "#F2F4F7",
  },
  dividerText: {
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "#475467",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  socialButtonsContainer: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  socialIcon: {
    width: "20px",
    height: "20px",
  },
  footer: {
    marginTop: "32px",
    fontSize: "0.875rem",
    color: "#667085",
    textAlign: "center",
  },
  switchBtn: {
    background: "none",
    border: "none",
    color: "#6941C6",
    fontWeight: 600,
    cursor: "pointer",
    padding: 0,
    fontSize: "inherit",
    fontFamily: "inherit",
  },
};
