"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Save01 as Save, 
  Eye, 
  EyeOff, 
  Key01 as Key, 
  CpuChip01 as Cpu, 
  Grid01 as Grid, 
  ShieldTick as ShieldCheck, 
  Database01 as Database,
  InfoCircle as Info
} from "@untitledui/icons";

export default function SettingsPage() {
  const router = useRouter();

  // Local storage state hooks
  const [openaiKey, setOpenaiKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [showKeys, setShowKeys] = useState(false);
  const [blueprintOpacity, setBlueprintOpacity] = useState(30);
  const [ambientGlow, setAmbientGlow] = useState(true);
  const [performanceMode, setPerformanceMode] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Load settings on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      setOpenaiKey(localStorage.getItem("loreloom_openai_key") || "");
      setGeminiKey(localStorage.getItem("loreloom_gemini_key") || "");
      
      const savedOpacity = localStorage.getItem("loreloom_blueprint_opacity");
      if (savedOpacity) setBlueprintOpacity(Number(savedOpacity));
      
      setAmbientGlow(localStorage.getItem("loreloom_ambient_glow") !== "false");
      setPerformanceMode(localStorage.getItem("loreloom_performance_mode") === "true");
    }
  }, []);

  const handleSave = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("loreloom_openai_key", openaiKey);
      localStorage.setItem("loreloom_gemini_key", geminiKey);
      localStorage.setItem("loreloom_blueprint_opacity", String(blueprintOpacity));
      localStorage.setItem("loreloom_ambient_glow", String(ambientGlow));
      localStorage.setItem("loreloom_performance_mode", String(performanceMode));
      
      // Update global body CSS variable for blueprint grid live sync
      document.documentElement.style.setProperty("--blueprint-opacity", String(blueprintOpacity / 100));
    }
    
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div style={styles.pageContainer}>
      {/* Dynamic Background Grid matching configuration */}
      <div 
        className="blueprint-grid" 
        style={{ opacity: blueprintOpacity / 100 }} 
      />

      <div style={styles.contentWrapper}>
        
        {/* Header Block */}
        <div style={styles.header}>
          <motion.button 
            onClick={() => router.push("/dashboard")} 
            style={styles.backBtn}
            whileHover={{ scale: 1.02, background: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.12)" }}
            whileTap={{ scale: 0.98 }}
          >
            <ArrowLeft size={16} />
            <span>Back to Dashboard</span>
          </motion.button>
          
          <h1 className="title-cyber" style={styles.title}>SYSTEM CONFIGURATION</h1>
          <p style={styles.subtitle}>Manage secure API credentials, graphic options, and model parameters.</p>
        </div>

        {/* Settings Form Layout */}
        <div style={styles.settingsGrid}>
          


          {/* Right Column: Visual Aesthetics & Performance */}
          <div className="glass-panel" style={styles.panel}>
            <div style={styles.panelHeader}>
              <Grid size={18} color="var(--accent-cyan)" />
              <h2 style={styles.panelTitle}>Visual & Layout Preferences</h2>
            </div>
            <p style={styles.panelDesc}>Adjust spatial rendering and animation rates to match your graphics card specs.</p>

            <div style={styles.formGroup}>
              <div style={styles.labelRow}>
                <label style={styles.label}>Blueprint Grid Opacity ({blueprintOpacity}%)</label>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={blueprintOpacity}
                onChange={(e) => setBlueprintOpacity(Number(e.target.value))}
                style={styles.slider}
              />
            </div>

            <div style={styles.toggleRow}>
              <div>
                <label style={styles.toggleLabel}>Ambient Particle Glows</label>
                <p style={styles.toggleDesc}>Render glowing abstract gradients in the background.</p>
              </div>
              <input
                type="checkbox"
                checked={ambientGlow}
                onChange={(e) => setAmbientGlow(e.target.checked)}
                style={styles.checkbox}
              />
            </div>

            <div style={styles.toggleRow}>
              <div>
                <label style={styles.toggleLabel}>Battery Saver Mode</label>
                <p style={styles.toggleDesc}>Reduce Framer Motion springs and transitions to save GPU cycles.</p>
              </div>
              <input
                type="checkbox"
                checked={performanceMode}
                onChange={(e) => setPerformanceMode(e.target.checked)}
                style={styles.checkbox}
              />
            </div>
          </div>

          {/* Bottom Card: System Tech Specs */}
          <div className="glass-panel" style={{ ...styles.panel, gridColumn: "1 / -1" }}>
            <div style={styles.panelHeader}>
              <Cpu size={18} color="var(--accent-gold)" />
              <h2 style={styles.panelTitle}>Loreloom Core Engine Stats</h2>
            </div>
            <div style={styles.specsGrid}>
              <div style={styles.specItem}>
                <span style={styles.specLabel}>FRAMEWORK</span>
                <span style={styles.specValue}>Next.js 16.2.10 (Turbopack)</span>
              </div>
              <div style={styles.specItem}>
                <span style={styles.specLabel}>STYLING TOOL</span>
                <span style={styles.specValue}>Vanilla CSS Modules / Tailwind</span>
              </div>
              <div style={styles.specItem}>
                <span style={styles.specLabel}>ON-CHAIN BRIDGE</span>
                <span style={styles.specValue}>Simulated Ethers Ledger</span>
              </div>
              <div style={styles.specItem}>
                <span style={styles.specLabel}>IPFS RESOLVER</span>
                <span style={styles.specValue}>Arweave Decentralized Gateway</span>
              </div>
            </div>
          </div>

        </div>

        {/* Save Bar */}
        <div style={styles.saveBar}>
          <motion.button
            onClick={handleSave}
            style={{
              ...styles.saveBtn,
              background: isSaved ? "#22c55e" : "linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))",
              boxShadow: isSaved ? "0 0 20px rgba(34, 197, 94, 0.4)" : "0 4px 15px rgba(176, 38, 255, 0.25)"
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isSaved ? <ShieldCheck size={16} /> : <Save size={16} />}
            <span>{isSaved ? "Configuration Saved" : "Save Changes"}</span>
          </motion.button>
        </div>

      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pageContainer: {
    padding: "32px 48px",
    minHeight: "100vh",
    background: "#050505",
    color: "#fff",
    position: "relative",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },
  contentWrapper: {
    maxWidth: "850px",
    width: "100%",
    margin: "0 auto",
    zIndex: 10,
    position: "relative",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
    paddingBottom: "24px",
  },
  backBtn: {
    alignSelf: "flex-start",
    background: "rgba(255, 255, 255, 0.02)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "8px",
    color: "var(--text-secondary)",
    padding: "8px 16px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "0.85rem",
    cursor: "pointer",
    fontFamily: "var(--font-inter)",
    fontWeight: 500,
    transition: "background 0.2s",
  },
  title: {
    fontSize: "1.5rem",
    fontWeight: 800,
    letterSpacing: "0.08em",
    color: "#fff",
    margin: "12px 0 0 0",
  },
  subtitle: {
    color: "var(--text-secondary)",
    fontSize: "0.9rem",
    margin: 0,
  },
  settingsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "24px",
  },
  panel: {
    background: "rgba(10, 10, 12, 0.6)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255, 255, 255, 0.04)",
    borderRadius: "16px",
    padding: "24px 32px",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  panelHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  panelTitle: {
    fontFamily: "var(--font-sans)",
    fontSize: "1.05rem",
    fontWeight: 600,
    color: "#fff",
    margin: 0,
  },
  panelDesc: {
    fontSize: "0.8rem",
    color: "var(--text-muted)",
    margin: "-8px 0 8px 0",
    lineHeight: 1.5,
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  labelRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: "0.75rem",
    fontFamily: "var(--font-mono)",
    color: "var(--text-secondary)",
    letterSpacing: "0.05em",
    textTransform: "uppercase",
  },
  toggleVisibilityBtn: {
    background: "transparent",
    border: "none",
    color: "var(--text-muted)",
    cursor: "pointer",
    padding: 0,
    display: "flex",
    alignItems: "center",
  },
  input: {
    width: "100%",
    background: "rgba(255,255,255,0.01)",
    border: "1px solid rgba(255,255,255,0.06)",
    color: "#fff",
  },
  infoBox: {
    background: "rgba(0, 214, 255, 0.04)",
    border: "1px solid rgba(0, 214, 255, 0.12)",
    borderRadius: "8px",
    padding: "10px 14px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginTop: "auto",
  },
  slider: {
    width: "100%",
    accentColor: "var(--accent-cyan)",
    cursor: "pointer",
    background: "rgba(255,255,255,0.08)",
    height: "6px",
    borderRadius: "3px",
  },
  toggleRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
    paddingBottom: "14px",
  },
  toggleLabel: {
    fontSize: "0.85rem",
    fontWeight: 500,
    color: "#fff",
  },
  toggleDesc: {
    fontSize: "0.75rem",
    color: "var(--text-muted)",
    margin: "2px 0 0 0",
  },
  checkbox: {
    width: "16px",
    height: "16px",
    accentColor: "var(--accent-purple)",
    cursor: "pointer",
  },
  specsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "20px",
  },
  specItem: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  specLabel: {
    fontSize: "0.7rem",
    fontFamily: "var(--font-mono)",
    color: "var(--text-muted)",
    letterSpacing: "0.08em",
  },
  specValue: {
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "#fff",
  },
  saveBar: {
    display: "flex",
    justifyContent: "flex-end",
    borderTop: "1px solid rgba(255,255,255,0.04)",
    paddingTop: "24px",
    marginTop: "16px",
  },
  saveBtn: {
    border: "none",
    borderRadius: "8px",
    color: "#fff",
    padding: "12px 28px",
    fontSize: "0.9rem",
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
    transition: "all 0.2s ease",
  }
};
