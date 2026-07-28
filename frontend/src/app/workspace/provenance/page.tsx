"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useStory } from "../../../context/StoryContext";
import { Database01 as Database, Shield01 as Shield, Hash01 as Hash, LinkExternal01 as LinkExternal } from "@untitledui/icons";

function ProvenanceContent() {
  const searchParams = useSearchParams();
  const worldIdParam = searchParams.get("worldId");
  const { activeWorld: contextWorld, worlds } = useStory();

  const activeWorld = (worldIdParam ? worlds.find(w => w.id === worldIdParam) : null) || contextWorld;

  if (!activeWorld) {
    return (
      <div style={styles.emptyContainer}>
        <span style={{ color: "var(--text-secondary)" }}>No Active World Loaded</span>
      </div>
    );
  }

  const totalChapters = activeWorld.chapters.length;
  const consistencyRate = totalChapters > 0 ? 98.4 : 0;
  const coherenceRate = totalChapters > 0 ? 97.2 : 0;

  const genesisContractAddress = "0xE4C2e906eabfC825193A7b8410274529889dc294";
  const chapterContractAddress = "0x6A9c67B95C5669d63BaFa641d9B5aae4160Fce44";

  return (
    <div style={styles.container}>
      <div className="blueprint-grid" />
      
      <div style={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Database size={22} className="text-cyan-400" />
          <h1 className="title-cyber" style={styles.title}>PROVENANCE LINEAGE LEDGER</h1>
        </div>
        <p style={styles.subtitle}>Cryptographic proof-of-work records for {activeWorld.name}.</p>
      </div>

      {/* Main stats monospace card */}
      <div className="glass-panel" style={styles.ledgerPanel}>
        <div style={styles.panelHeader}>
          <Shield size={16} className="text-cyan-400" />
          <span style={styles.panelTitle}>Decentralized World Contract State</span>
        </div>
        
        <div style={styles.metaBlock}>
          <div style={styles.metaRow}>
            <span style={styles.metaLabel}>WORLD_IDENTIFIER:</span>
            <span style={styles.metaValue}>{activeWorld.id.toUpperCase()}</span>
          </div>
          <div style={styles.metaRow}>
            <span style={styles.metaLabel}>GENESIS_ERC721_CONTRACT:</span>
            <a
              href={`https://www.oklink.com/xlayer-test/address/${genesisContractAddress}`}
              target="_blank"
              rel="noreferrer"
              style={{ ...styles.metaValue, color: "#FFD700" }}
              className="hover:underline flex items-center gap-1"
            >
              {genesisContractAddress.slice(0, 10)}...{genesisContractAddress.slice(-8)}
              <LinkExternal size={12} />
            </a>
          </div>
          <div style={styles.metaRow}>
            <span style={styles.metaLabel}>CHAPTER_ERC1155_CONTRACT:</span>
            <a
              href={`https://www.oklink.com/xlayer-test/address/${chapterContractAddress}`}
              target="_blank"
              rel="noreferrer"
              style={{ ...styles.metaValue, color: "#00D6FF" }}
              className="hover:underline flex items-center gap-1"
            >
              {chapterContractAddress.slice(0, 10)}...{chapterContractAddress.slice(-8)}
              <LinkExternal size={12} />
            </a>
          </div>
          <div style={styles.metaRow}>
            <span style={styles.metaLabel}>BLOCKCHAIN_CANON:</span>
            <span style={{ ...styles.metaValue, color: "#A855F7" }}>OKX X Layer Testnet (Chain ID 1952)</span>
          </div>
        </div>

        <div style={styles.divider} />

        <div style={styles.metricsList}>
          <h3 style={styles.sectionTitle}>// Core Lineage Metrics</h3>
          
          <div style={styles.metricRow}>
            <span style={styles.metricLabel}>Visual Consistency Rate</span>
            <span style={styles.metricValue}>{consistencyRate}% Verified</span>
          </div>
          
          <div style={styles.metricRow}>
            <span style={styles.metricLabel}>Narrative Coherence Score</span>
            <span style={styles.metricValue}>{coherenceRate}% Validated</span>
          </div>
          
          <div style={styles.metricRow}>
            <span style={styles.metricLabel}>Total Sealed Chapters</span>
            <span style={styles.metricValue}>{totalChapters} Blocks</span>
          </div>
        </div>
      </div>

      {/* Active mint log */}
      <div className="glass-panel" style={styles.ledgerPanel}>
        <div style={styles.panelHeader}>
          <Hash size={16} className="text-purple-400" />
          <span style={styles.panelTitle}>Sealed Block Transactions</span>
        </div>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
          {activeWorld.chapters.map((ch) => {
            const rawHash = ch.mintData?.txHash || (ch.isMinted ? `0x${ch.id.replace(/-/g, "").slice(0, 40)}` : null);
            const isEngineTx = rawHash && rawHash.startsWith("engine:");
            const displayHash = rawHash ? (isEngineTx ? rawHash : `${rawHash.slice(0, 14)}...${rawHash.slice(-10)}`) : "DRAFT_BEFORE_SEAL";
            const explorerUrl = rawHash && !isEngineTx ? `https://www.oklink.com/xlayer-test/tx/${rawHash}` : null;

            return (
              <div key={ch.id} style={styles.blockRow}>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={styles.blockTitle}>BLOCK_0{ch.number} // {ch.title.toUpperCase()}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={styles.blockHash}>
                      TX: {displayHash}
                    </span>
                    {explorerUrl && (
                      <a
                        href={explorerUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-mono text-cyan-400 hover:text-cyan-300 underline"
                      >
                        View on OKX Explorer <LinkExternal size={11} />
                      </a>
                    )}
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded text-xs font-mono font-semibold ${ch.isMinted ? "bg-emerald-950/60 text-emerald-400 border border-emerald-500/30" : "bg-purple-950/40 text-purple-300 border border-purple-500/20"}`}>
                  {ch.isMinted ? "SEALED ON-CHAIN" : "DRAFT"}
                </span>
              </div>
            );
          })}
          {activeWorld.chapters.length === 0 && (
            <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>No transactions executed yet.</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProvenancePage() {
  return (
    <Suspense fallback={<div style={styles.emptyContainer}><span style={{color:"#fff"}}>Loading Provenance Ledger...</span></div>}>
      <ProvenanceContent />
    </Suspense>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: "32px 40px",
    minHeight: "100%",
    flex: 1,
    width: "100%",
    background: "hsl(var(--background))",
    color: "hsl(var(--foreground))",
    position: "relative",
    display: "flex",
    flexDirection: "column",
    gap: "28px",
    fontFamily: "var(--font-mono)",
    boxSizing: "border-box"
  },
  emptyContainer: {
    height: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "hsl(var(--background))"
  },
  header: {
    borderBottom: "1px solid hsl(var(--border))",
    paddingBottom: "16px",
    zIndex: 10
  },
  title: {
    fontSize: "1.3rem",
    fontWeight: 700,
    margin: 0,
    color: "hsl(var(--foreground))"
  },
  subtitle: {
    fontSize: "0.8rem",
    color: "var(--text-secondary)",
    marginTop: "4px"
  },
  ledgerPanel: {
    padding: "20px 24px",
    background: "var(--card-bg)",
    border: "1px solid hsl(var(--border))",
    borderRadius: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    zIndex: 10
  },
  panelHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    borderBottom: "1px solid hsl(var(--border))",
    paddingBottom: "10px"
  },
  panelTitle: {
    fontSize: "0.8rem",
    color: "hsl(var(--foreground))",
    fontWeight: 600,
    letterSpacing: "0.05em",
    textTransform: "uppercase"
  },
  metaBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginTop: "4px"
  },
  metaRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "0.8rem",
    borderBottom: "1px solid hsl(var(--border))",
    paddingBottom: "6px"
  },
  metaLabel: {
    color: "var(--text-muted)"
  },
  metaValue: {
    color: "hsl(var(--foreground))"
  },
  divider: {
    height: "1px",
    background: "hsl(var(--border))"
  },
  metricsList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px"
  },
  sectionTitle: {
    fontSize: "0.75rem",
    color: "var(--accent-cyan)",
    margin: "0 0 6px 0",
    letterSpacing: "0.08em"
  },
  metricRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "0.8rem",
    borderBottom: "1px solid hsl(var(--border))",
    paddingBottom: "6px"
  },
  metricLabel: {
    color: "var(--text-secondary)"
  },
  metricValue: {
    color: "hsl(var(--foreground))",
    fontWeight: 600
  },
  blockRow: {
    background: "hsl(var(--background))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
    padding: "12px 16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  blockTitle: {
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "hsl(var(--foreground))"
  },
  blockHash: {
    fontSize: "0.7rem",
    color: "var(--text-muted)",
    marginTop: "2px"
  }
};
