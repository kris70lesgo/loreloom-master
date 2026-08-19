"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStory } from "../../context/StoryContext";
import { getLoreloomOwner, loreloomApiPath, loreloomFetch } from "@/lib/api/loreloomFetch";
import { motion, AnimatePresence } from "framer-motion";
import {
  User01 as User,
  Stars01 as Sparkles,
  Code01 as Code,
  Database01 as Database,
  Palette,
  Atom01 as Dna,
  Folder,
  File01 as FileText,
  ChevronRight,
  XClose as X,
  ArrowUp,
} from "@untitledui/icons";

interface AiOutput {
  characterDetails: {
    name: string;
    skinComplexion: string;
    face: string;
    faceShape: string;
    eyes: string;
    height: string;
    bodyType: string;
    backstories: string;
    protagonistArchetype: string;
    woundOrMotivation: string;
  };
  plot: {
    coreConflict: string;
    slowRevealNotes: string;
    growthArc: string;
  };
  cinematicVerse: {
    animationStyle: string;
    backgroundsAndLayouts: string;
    hardRules: string;
  };
}

const STYLE_PRESETS = [
  {
    id: "hoysala",
    name: "Hoysala Architecture",
    desc: "Intricate soapstone carvings, star-shaped temple platforms, Chennakeshava sculptural detail, 12th-century Karnataka.",
    accent: "#d4a017",
    gradient: "linear-gradient(45deg, rgba(212,160,23,0.3), rgba(0,0,0,0.8))",
    bgImage: "/cyberpunk_aesthetic_1783952093744.png"
  },
  {
    id: "vijayanagara",
    name: "Vijayanagara Empire",
    desc: "Hampi boulder landscapes, ruined palaces, stone chariots, Tungabhadra river, 14th-century imperial grandeur.",
    accent: "#c0392b",
    gradient: "linear-gradient(45deg, rgba(192,57,43,0.3), rgba(0,0,0,0.8))",
    bgImage: "/aetherpunk_aesthetic_1783952104106.png"
  },
  {
    id: "mysore-royal",
    name: "Mysore Royal Heritage",
    desc: "Indo-Saracenic palace facades, Dasara processions, golden throne, royal durbar, Wodeyar dynasty opulence.",
    accent: "#f39c12",
    gradient: "linear-gradient(45deg, rgba(243,156,18,0.3), rgba(0,0,0,0.8))",
    bgImage: "/biopunk_aesthetic_1783952115517.png"
  },
  {
    id: "western-ghats",
    name: "Western Ghats & Nature",
    desc: "Misty coffee plantations, evergreen forests, Jog Falls, Kodagu mist, biodiversity of the Sahyadri range.",
    accent: "#27ae60",
    gradient: "linear-gradient(45deg, rgba(39,174,96,0.3), rgba(0,0,0,0.8))",
    bgImage: "/gothic_aesthetic_1783952126750.png"
  },
  {
    id: "custom",
    name: "Custom / Blank Canvas",
    desc: "Define your own visual aesthetic rooted in Karnataka's diverse cultural and natural heritage.",
    accent: "#ffffff",
    gradient: "linear-gradient(45deg, rgba(255,255,255,0.2), rgba(0,0,0,0.8))",
    bgImage: "/custom_aesthetic_1783952137526.png"
  }
];

const SPECIES_OPTIONS = [
  { id: "heritage-site", label: "Heritage Site", icon: Database, desc: "Temples, monuments, ruins, and historical landmarks of Karnataka." },
  { id: "folklore", label: "Folklore & Legend", icon: Sparkles, desc: "Oral traditions, village stories, myths, and local legends passed down through generations." },
  { id: "festival", label: "Festival & Tradition", icon: Palette, desc: "Celebrations, rituals, and cultural practices like Dasara, Karaga, and Ugadi." },
  { id: "artisan", label: "Artisan & Craft", icon: User, desc: "Traditional crafts — Mysore Silk, Channapatna toys, Sandalwood carving, and folk arts like Yakshagana." }
];



function mapWorldToAiOutput(world: any): AiOutput {
  const charSheet = world.character_sheet || {};
  const traits = charSheet.visualTraits || [];
  const personality = charSheet.personality || [];
  const styleKeywords = charSheet.styleKeywords || [];
  const intake = world.intake || {};
  
  return {
    characterDetails: {
      name: charSheet.name || intake.protagonistName || "Unnamed Heritage Subject",
      skinComplexion: traits[0] || "Warm brown complexion, traditional Karnataka attire",
      face: traits[1] || "Expressive features, traditional forehead markings",
      faceShape: traits[2] || "Classical South Indian facial structure",
      eyes: traits[3] || "Deep brown, reflecting heritage and wisdom",
      height: traits[4] || "Average build",
      bodyType: traits[5] || "Traditional attire, culturally authentic",
      backstories: charSheet.characterSummary || intake.protagonistDesc || "No heritage narrative generated.",
      protagonistArchetype: personality.join(", ") || "Guardian of cultural heritage",
      woundOrMotivation: intake.relicName ? `Preserve the ${intake.relicName}` : "Preserve cultural memory for future generations"
    },
    plot: {
      coreConflict: Array.isArray(world.open_threads) ? world.open_threads.join("; ") : "The fading of oral traditions and cultural knowledge across generations.",
      slowRevealNotes: Array.isArray(world.world_facts) ? world.world_facts.join("; ") : "Historical records and folklore reveal deeper cultural significance.",
      growthArc: charSheet.growthArc || "Begins as a curious explorer and becomes a passionate custodian of Karnataka's living heritage."
    },
    cinematicVerse: {
      animationStyle: styleKeywords.join(", ") || "Historically inspired, culturally authentic illustration",
      backgroundsAndLayouts: charSheet.backgroundsAndLayouts || "Period-appropriate settings with architectural and natural elements of Karnataka",
      hardRules: charSheet.hardRules || "Historical accuracy for documented facts. Folklore and legends are clearly distinguished from verified history."
    }
  };
}

export default function GenesisPage() {
  const router = useRouter();
  const { createWorld, worlds } = useStory();

  const [showLimitAlert, setShowLimitAlert] = useState(false);

  // Enforce Free Tier Limit
  useEffect(() => {
    if (worlds.length >= 2) {
      setShowLimitAlert(true);
    }
  }, [worlds.length]);

  // Cursor Spotlight
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const [genesisData, setGenesisData] = useState({ species: "", style: "", prompt: "" });
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const saved = sessionStorage.getItem("loreloom_genesis");
    if (saved) {
      try {
        setGenesisData(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse genesis data");
      }
    }
  }, []);

  useEffect(() => {
    if (isMounted) {
      sessionStorage.setItem("loreloom_genesis", JSON.stringify(genesisData));
    }
  }, [genesisData, isMounted]);

  const [step, setStep] = useState(1);
  const [viewMode, setViewMode] = useState<"ui" | "json">("ui");
  const [aiOutput, setAiOutput] = useState<AiOutput | null>(null);
  const [createdWorldId, setCreatedWorldId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(15);
  const [isPortraitReady, setIsPortraitReady] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleDragStart = (e: React.DragEvent, node: { path: string; label: string; value: string }) => {
    e.dataTransfer.setData("application/json", JSON.stringify(node));
    e.dataTransfer.effectAllowed = "copy";
  };
  
  const [selectedNodes, setSelectedNodes] = useState<{ path: string; label: string; value: string }[]>([]);
  const [refinePrompt, setRefinePrompt] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "model"; content: string }[]>([]);
  const [isPromptFocused, setIsPromptFocused] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);

  useEffect(() => {
    const shouldHideShell = step === 4 && !isCommitting;
    document.body.classList.toggle("loreloom-generating", shouldHideShell);

    return () => {
      document.body.classList.remove("loreloom-generating");
    };
  }, [step, isCommitting]);

  const toggleNodeSelection = (node: { path: string; label: string; value: string }) => {
    setSelectedNodes(prev => {
      const exists = prev.some(n => n.path === node.path);
      if (exists) {
        return prev.filter(n => n.path !== node.path);
      } else {
        return [...prev, node];
      }
    });
  };

  const executeRefinement = async () => {
    if (!refinePrompt.trim() || !aiOutput) return;
    const instruction = refinePrompt.trim();
    setIsRefining(true);
    setError(null);
    
    // Add User Message to Chat History
    const targetLabel = selectedNodes.length > 0 ? selectedNodes.map(n => n.label).join(", ") : "General";
    setChatHistory(prev => [...prev, { role: "user", content: `Refine [${targetLabel}]: ${instruction}` }]);
    
    try {
      const prompt = [
        `You are the Loreloom Story Engine.`,
        `Given the current character genesis JSON schema:`,
        JSON.stringify(aiOutput, null, 2),
        ``,
        `Refine the character genesis details based on this user instruction:`,
        `"${instruction}"`,
        ``,
        selectedNodes.length > 0 
          ? `Specifically focus on updating the following parameters: ${selectedNodes.map(n => n.path).join(", ")}.`
          : `Update the overall canon and parameters as requested by the instruction.`,
        ``,
        `IMPORTANT: If the character/hero name (characterDetails.name) is changed or updated (either by being explicitly targeted or mentioned in the user instruction), you MUST scan all other text fields in the entire JSON (such as backstories, woundOrMotivation, coreConflict, slowRevealNotes, growthArc, backgroundsAndLayouts, hardRules, etc.) and replace ALL occurrences of the old name with the new name to ensure consistency across the entire canon plan.`,
        ``,
        `You MUST return ONLY the updated JSON object. Do NOT wrap it in markdown code blocks, do NOT include backticks (e.g. \`\`\`json), and do NOT add any conversational prefix or suffix. Return a single raw JSON object that matches the input structure exactly.`
      ].join("\n");

      const response = await fetch(loreloomApiPath("/api/ai/generate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "gemini",
          prompt: prompt,
          systemPrompt: "You are a JSON refinement assistant. Output only raw JSON."
        })
      });

      if (!response.ok) {
        throw new Error("Failed to communicate with AI refinement model");
      }

      const result = await response.json();
      let cleanText = result.text.trim();
      if (cleanText.startsWith("```")) {
        cleanText = cleanText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      }

      let updated = JSON.parse(cleanText) as AiOutput;
      
      // Programmatic Name Change Propagation Safeguard
      const oldName = aiOutput.characterDetails.name?.trim();
      const newName = updated.characterDetails.name?.trim();
      if (oldName && newName && oldName !== newName) {
        const replaceNameRecursively = (val: any): any => {
          if (typeof val === "string") {
            const escaped = oldName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const regex = new RegExp(`\\b${escaped}\\b`, "gi");
            return val.replace(regex, newName);
          }
          if (Array.isArray(val)) {
            return val.map(replaceNameRecursively);
          }
          if (typeof val === "object" && val !== null) {
            const next: any = {};
            for (const key of Object.keys(val)) {
              next[key] = replaceNameRecursively(val[key]);
            }
            return next;
          }
          return val;
        };
        updated = replaceNameRecursively(updated);
      }
      
      setAiOutput(updated);
      setChatHistory(prev => [...prev, { role: "model", content: `Refinement complete. Canon details updated and synchronized.` }]);
      setRefinePrompt("");
      setSelectedNodes([]);
    } catch (err: any) {
      console.error("Refinement error:", err);
      // Fallback to local mock if AI endpoint fails
      let updated = { ...aiOutput };
      const oldName = aiOutput.characterDetails.name?.trim();
      
      if (selectedNodes.length > 0) {
        selectedNodes.forEach(node => {
          const path = node.path;
          if (path.startsWith("characterDetails.")) {
            const field = path.split(".")[1] as keyof typeof updated.characterDetails;
            updated.characterDetails[field] = instruction;
          } else if (path.startsWith("plot.")) {
            const field = path.split(".")[1] as keyof typeof updated.plot;
            updated.plot[field] = instruction;
          } else if (path.startsWith("cinematicVerse.")) {
            const field = path.split(".")[1] as keyof typeof updated.cinematicVerse;
            updated.cinematicVerse[field] = instruction;
          }
        });
        
        // Also apply programmatic propagation to fallback edits
        const newName = updated.characterDetails.name?.trim();
        if (oldName && newName && oldName !== newName) {
          const replaceNameRecursively = (val: any): any => {
            if (typeof val === "string") {
              const escaped = oldName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
              const regex = new RegExp(`\\b${escaped}\\b`, "gi");
              return val.replace(regex, newName);
            }
            if (Array.isArray(val)) {
              return val.map(replaceNameRecursively);
            }
            if (typeof val === "object" && val !== null) {
              const next: any = {};
              for (const key of Object.keys(val)) {
                next[key] = replaceNameRecursively(val[key]);
              }
              return next;
            }
            return val;
          };
          updated = replaceNameRecursively(updated);
        }
        
        setAiOutput(updated);
        setChatHistory(prev => [...prev, { role: "model", content: `Local refinement fallback applied for selected nodes.` }]);
      } else {
        setChatHistory(prev => [...prev, { role: "model", content: `Error: ${err.message || "Failed to parse AI response"}. Local refinement fallback: no node selected, so no change applied.` }]);
      }
    } finally {
      setIsRefining(false);
    }
  };

  const renderTree = () => {
    if (!aiOutput) return null;
    const selectedStyle = STYLE_PRESETS.find(s => s.name === genesisData.style);
    const accent = selectedStyle ? selectedStyle.accent : "var(--accent-purple)";

    const isSelected = (path: string) => selectedNodes.some(n => n.path === path);
    const nodeStyle = (path: string) => ({
      ...styles.treeNode,
      border: isSelected(path) ? `1px solid ${accent}` : "1px solid hsl(var(--border))",
      background: isSelected(path) ? `${accent}18` : "var(--card-bg)",
      boxShadow: isSelected(path) ? `0 0 12px ${accent}20` : "none",
      cursor: "grab",
      userSelect: "none" as const
    });

    return (
      <div className="hide-scrollbar" style={styles.rightTreePanel}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", color: "var(--text-secondary)", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          <Folder size={14} /> <span>Root: Genesis Canon</span>
        </div>
        
        {/* Style/Theme Info */}
        <div style={styles.treeBranch}>
          <div style={{...styles.treeNode, cursor: "default", background: "var(--card-bg)", border: "1px solid hsl(var(--border))"}}>
            <Palette size={14} color={accent} style={{ marginTop: "2px", flexShrink: 0 }} />
            <span style={{ lineHeight: "1.5", wordBreak: "break-word" }}><strong>Theme Style:</strong> {genesisData.style}</span>
          </div>
          <div style={{...styles.treeNode, cursor: "default", background: "var(--card-bg)", border: "1px solid hsl(var(--border))"}}>
            <Dna size={14} style={{ marginTop: "2px", flexShrink: 0 }} />
            <span style={{ lineHeight: "1.5", wordBreak: "break-word" }}><strong>Heritage Category:</strong> {SPECIES_OPTIONS.find(s => s.id === genesisData.species)?.label || genesisData.species}</span>
          </div>
        </div>

        {/* 1. Character Details Branch */}
        <div style={{ marginTop: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "hsl(var(--foreground))", fontSize: "0.95rem", fontWeight: 600, marginBottom: "8px" }}>
            <ChevronRight size={14} style={{ transform: "rotate(90deg)" }} />
            <User size={14} />
            <span>1. Character Details</span>
          </div>
          <div style={styles.treeBranch}>
            <div style={nodeStyle("characterDetails.name")} onClick={() => toggleNodeSelection({ path: "characterDetails.name", label: "Character Name", value: aiOutput.characterDetails.name })} draggable onDragStart={(e) => handleDragStart(e, { path: "characterDetails.name", label: "Character Name", value: aiOutput.characterDetails.name })}>
              <FileText size={14} style={{ marginTop: "3px", flexShrink: 0 }} />
              <span style={{ lineHeight: "1.5", wordBreak: "break-word" }}><strong>Name:</strong> {aiOutput.characterDetails.name}</span>
            </div>
            <div style={nodeStyle("characterDetails.skinComplexion")} onClick={() => toggleNodeSelection({ path: "characterDetails.skinComplexion", label: "Skin Complexion", value: aiOutput.characterDetails.skinComplexion })} draggable onDragStart={(e) => handleDragStart(e, { path: "characterDetails.skinComplexion", label: "Skin Complexion", value: aiOutput.characterDetails.skinComplexion })}>
              <FileText size={14} style={{ marginTop: "3px", flexShrink: 0 }} />
              <span style={{ lineHeight: "1.5", wordBreak: "break-word" }}><strong>Skin Complexion:</strong> {aiOutput.characterDetails.skinComplexion}</span>
            </div>
            <div style={nodeStyle("characterDetails.face")} onClick={() => toggleNodeSelection({ path: "characterDetails.face", label: "Facial Features", value: aiOutput.characterDetails.face })} draggable onDragStart={(e) => handleDragStart(e, { path: "characterDetails.face", label: "Facial Features", value: aiOutput.characterDetails.face })}>
              <FileText size={14} style={{ marginTop: "3px", flexShrink: 0 }} />
              <span style={{ lineHeight: "1.5", wordBreak: "break-word" }}><strong>Face:</strong> {aiOutput.characterDetails.face}</span>
            </div>
            <div style={nodeStyle("characterDetails.faceShape")} onClick={() => toggleNodeSelection({ path: "characterDetails.faceShape", label: "Face Shape", value: aiOutput.characterDetails.faceShape })} draggable onDragStart={(e) => handleDragStart(e, { path: "characterDetails.faceShape", label: "Face Shape", value: aiOutput.characterDetails.faceShape })}>
              <FileText size={14} style={{ marginTop: "3px", flexShrink: 0 }} />
              <span style={{ lineHeight: "1.5", wordBreak: "break-word" }}><strong>Face Shape:</strong> {aiOutput.characterDetails.faceShape}</span>
            </div>
            <div style={nodeStyle("characterDetails.eyes")} onClick={() => toggleNodeSelection({ path: "characterDetails.eyes", label: "Eye Specs", value: aiOutput.characterDetails.eyes })} draggable onDragStart={(e) => handleDragStart(e, { path: "characterDetails.eyes", label: "Eye Specs", value: aiOutput.characterDetails.eyes })}>
              <FileText size={14} style={{ marginTop: "3px", flexShrink: 0 }} />
              <span style={{ lineHeight: "1.5", wordBreak: "break-word" }}><strong>Eyes:</strong> {aiOutput.characterDetails.eyes}</span>
            </div>
            <div style={nodeStyle("characterDetails.height")} onClick={() => toggleNodeSelection({ path: "characterDetails.height", label: "Height", value: aiOutput.characterDetails.height })} draggable onDragStart={(e) => handleDragStart(e, { path: "characterDetails.height", label: "Height", value: aiOutput.characterDetails.height })}>
              <FileText size={14} style={{ marginTop: "3px", flexShrink: 0 }} />
              <span style={{ lineHeight: "1.5", wordBreak: "break-word" }}><strong>Height:</strong> {aiOutput.characterDetails.height}</span>
            </div>
            <div style={nodeStyle("characterDetails.bodyType")} onClick={() => toggleNodeSelection({ path: "characterDetails.bodyType", label: "Body Type", value: aiOutput.characterDetails.bodyType })} draggable onDragStart={(e) => handleDragStart(e, { path: "characterDetails.bodyType", label: "Body Type", value: aiOutput.characterDetails.bodyType })}>
              <FileText size={14} style={{ marginTop: "3px", flexShrink: 0 }} />
              <span style={{ lineHeight: "1.5", wordBreak: "break-word" }}><strong>Body Type:</strong> {aiOutput.characterDetails.bodyType}</span>
            </div>
            <div style={nodeStyle("characterDetails.backstories")} onClick={() => toggleNodeSelection({ path: "characterDetails.backstories", label: "Backstories", value: aiOutput.characterDetails.backstories })} draggable onDragStart={(e) => handleDragStart(e, { path: "characterDetails.backstories", label: "Backstories", value: aiOutput.characterDetails.backstories })}>
              <FileText size={14} style={{ marginTop: "3px", flexShrink: 0 }} />
              <span style={{ lineHeight: "1.5", wordBreak: "break-word" }}><strong>Backstories:</strong> {aiOutput.characterDetails.backstories}</span>
            </div>
            <div style={nodeStyle("characterDetails.protagonistArchetype")} onClick={() => toggleNodeSelection({ path: "characterDetails.protagonistArchetype", label: "Protagonist Archetype", value: aiOutput.characterDetails.protagonistArchetype })} draggable onDragStart={(e) => handleDragStart(e, { path: "characterDetails.protagonistArchetype", label: "Protagonist Archetype", value: aiOutput.characterDetails.protagonistArchetype })}>
              <FileText size={14} style={{ marginTop: "3px", flexShrink: 0 }} />
              <span style={{ lineHeight: "1.5", wordBreak: "break-word" }}><strong>Protagonist:</strong> {aiOutput.characterDetails.protagonistArchetype}</span>
            </div>
            <div style={nodeStyle("characterDetails.woundOrMotivation")} onClick={() => toggleNodeSelection({ path: "characterDetails.woundOrMotivation", label: "Core Wound/Motivation", value: aiOutput.characterDetails.woundOrMotivation })} draggable onDragStart={(e) => handleDragStart(e, { path: "characterDetails.woundOrMotivation", label: "Core Wound/Motivation", value: aiOutput.characterDetails.woundOrMotivation })}>
              <FileText size={14} style={{ marginTop: "3px", flexShrink: 0 }} />
              <span style={{ lineHeight: "1.5", wordBreak: "break-word" }}><strong>Wound/Motivation:</strong> {aiOutput.characterDetails.woundOrMotivation}</span>
            </div>
          </div>
        </div>

        {/* 2. Plot Branch */}
        <div style={{ marginTop: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#fff", fontSize: "0.95rem", fontWeight: 600, marginBottom: "8px" }}>
            <ChevronRight size={14} style={{ transform: "rotate(90deg)" }} />
            <Code size={14} />
            <span>2. Narrative</span>
          </div>
          <div style={styles.treeBranch}>
            <div style={nodeStyle("plot.coreConflict")} onClick={() => toggleNodeSelection({ path: "plot.coreConflict", label: "Core Conflict", value: aiOutput.plot.coreConflict })} draggable onDragStart={(e) => handleDragStart(e, { path: "plot.coreConflict", label: "Core Conflict", value: aiOutput.plot.coreConflict })}>
              <FileText size={14} style={{ marginTop: "3px", flexShrink: 0 }} />
              <span style={{ lineHeight: "1.5", wordBreak: "break-word" }}><strong>Core Conflict:</strong> {aiOutput.plot.coreConflict}</span>
            </div>
            <div style={nodeStyle("plot.slowRevealNotes")} onClick={() => toggleNodeSelection({ path: "plot.slowRevealNotes", label: "Slow Reveal Notes", value: aiOutput.plot.slowRevealNotes })} draggable onDragStart={(e) => handleDragStart(e, { path: "plot.slowRevealNotes", label: "Slow Reveal Notes", value: aiOutput.plot.slowRevealNotes })}>
              <FileText size={14} style={{ marginTop: "3px", flexShrink: 0 }} />
              <span style={{ lineHeight: "1.5", wordBreak: "break-word" }}><strong>Slow Reveal:</strong> {aiOutput.plot.slowRevealNotes}</span>
            </div>
            <div style={nodeStyle("plot.growthArc")} onClick={() => toggleNodeSelection({ path: "plot.growthArc", label: "Growth Arc", value: aiOutput.plot.growthArc })} draggable onDragStart={(e) => handleDragStart(e, { path: "plot.growthArc", label: "Growth Arc", value: aiOutput.plot.growthArc })}>
              <FileText size={14} style={{ marginTop: "3px", flexShrink: 0 }} />
              <span style={{ lineHeight: "1.5", wordBreak: "break-word" }}><strong>Growth Arc:</strong> {aiOutput.plot.growthArc}</span>
            </div>
          </div>
        </div>

        {/* 3. Cinematic Verse Branch */}
        <div style={{ marginTop: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#fff", fontSize: "0.95rem", fontWeight: 600, marginBottom: "8px" }}>
            <ChevronRight size={14} style={{ transform: "rotate(90deg)" }} />
            <Sparkles size={14} style={{ transform: "rotate(90deg)", flexShrink: 0 }} />
            <span>3. Cinematic Verse</span>
          </div>
          <div style={styles.treeBranch}>
            <div style={nodeStyle("cinematicVerse.animationStyle")} onClick={() => toggleNodeSelection({ path: "cinematicVerse.animationStyle", label: "Animation Style", value: aiOutput.cinematicVerse.animationStyle })} draggable onDragStart={(e) => handleDragStart(e, { path: "cinematicVerse.animationStyle", label: "Animation Style", value: aiOutput.cinematicVerse.animationStyle })}>
              <FileText size={14} style={{ marginTop: "3px", flexShrink: 0 }} />
              <span style={{ lineHeight: "1.5", wordBreak: "break-word" }}><strong>Animation:</strong> {aiOutput.cinematicVerse.animationStyle}</span>
            </div>
            <div style={nodeStyle("cinematicVerse.backgroundsAndLayouts")} onClick={() => toggleNodeSelection({ path: "cinematicVerse.backgroundsAndLayouts", label: "Backgrounds & Layouts", value: aiOutput.cinematicVerse.backgroundsAndLayouts })} draggable onDragStart={(e) => handleDragStart(e, { path: "cinematicVerse.backgroundsAndLayouts", label: "Backgrounds & Layouts", value: aiOutput.cinematicVerse.backgroundsAndLayouts })}>
              <FileText size={14} style={{ marginTop: "3px", flexShrink: 0 }} />
              <span style={{ lineHeight: "1.5", wordBreak: "break-word" }}><strong>3D Backgrounds & Layouts:</strong> {aiOutput.cinematicVerse.backgroundsAndLayouts}</span>
            </div>
            <div style={nodeStyle("cinematicVerse.hardRules")} onClick={() => toggleNodeSelection({ path: "cinematicVerse.hardRules", label: "Hard Rules", value: aiOutput.cinematicVerse.hardRules })} draggable onDragStart={(e) => handleDragStart(e, { path: "cinematicVerse.hardRules", label: "Hard Rules", value: aiOutput.cinematicVerse.hardRules })}>
              <FileText size={14} style={{ marginTop: "3px", flexShrink: 0 }} />
              <span style={{ lineHeight: "1.5", wordBreak: "break-word" }}><strong>Set Hard Rules:</strong> {aiOutput.cinematicVerse.hardRules}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };
  


  const updateData = (key: string, value: string) => {
    setGenesisData((prev) => ({ ...prev, [key]: value }));
  };

  const handleNext = () => setStep((s) => s + 1);
  const handleBack = () => setStep((s) => s - 1);

  const startSynthesis = async () => {
    setStep(4); // Processing step
    setError(null);
    setProgress(15);
    setIsPortraitReady(false);

    const { ownerId } = await getLoreloomOwner();
    try {
      if (!ownerId) {
        throw new Error("Could not identify the current user.");
      }

      const response = await loreloomFetch(loreloomApiPath("/api/worlds"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorId: ownerId,
          walletAddress: ownerId,
          title: `${genesisData.style ? genesisData.style.split(' ')[0] : 'Karnataka'} Heritage`,
          intake: {
            prompt: genesisData.prompt,
            style: genesisData.style,
            species: genesisData.species
          },
          styleLock: genesisData.style
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error ?? "Failed to initialize world");
      }

      const result = await response.json();
      setCreatedWorldId(result.world.id);
    } catch (err: any) {
      console.error("Failed to start synthesis:", err);
      setError(err.message || "Failed to initialize AI generation. Please check backend connection.");
    }
  };

  // Polling hook to query generated character sheet
  useEffect(() => {
    if (!createdWorldId) return;

    let isMounted = true;
    let attempts = 0;
    const poll = async () => {
      try {
        attempts += 1;

        // Dynamic progress weaving logic
        setProgress((prev) => {
          if (prev < 45) return prev + Math.floor(Math.random() * 6) + 3;
          if (prev < 88) return prev + Math.floor(Math.random() * 4) + 1;
          return prev;
        });

        const res = await loreloomFetch(loreloomApiPath(`/api/worlds/${createdWorldId}`));
        if (!res.ok) return;
        const data = await res.json();
        const world = data.world;

        const charSheet = world.character_sheet;
        const hasCharSheet = charSheet && Object.keys(charSheet).length > 0;
        const hasPortrait = world.reference_image_url !== null;

        // Optimistic UI: Transition as soon as the text (character sheet) is ready.
        if (hasCharSheet && isMounted) {
          setProgress(100);
          if (step < 5) {
            setAiOutput(mapWorldToAiOutput(world));
            setStep(5); // Transition to success step
          }
        }

        if (hasPortrait && isMounted) {
          setIsPortraitReady(true);
        }

        // Only timeout if we haven't even generated the text character sheet yet!
        if (attempts > 150 && !hasCharSheet) {
          if (isMounted) {
            setError("Generation timed out. The background worker is taking longer than expected.");
          }
          return;
        }
      } catch (err) {
        console.error("Error polling world details:", err);
      }
    };

    const interval = setInterval(poll, 2000);
    poll(); // Run once immediately

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [createdWorldId, step]);

  const confirmGenesis = async () => {
    if (!createdWorldId) return;
    setIsCommitting(true);
    setError(null);

    try {
      const response = await loreloomFetch(loreloomApiPath(`/api/worlds/${createdWorldId}/confirm`), {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error ?? "Failed to commit world to chain");
      }

      sessionStorage.removeItem("loreloom_genesis");
      router.push(`/workspace?worldId=${createdWorldId}`);
    } catch (err: any) {
      console.error("Failed to commit genesis:", err);
      setError(err.message || "Failed to commit world to chain.");
      setIsCommitting(false);
    }
  };

  const promptLength = genesisData.prompt?.length || 0;
  const glowColor = promptLength > 100 
    ? "rgba(0, 214, 255, 0.8)" 
    : promptLength > 20 
      ? "rgba(176, 38, 255, 0.8)" 
      : "rgba(255, 255, 255, 0.2)";

  // Framer Motion spring config
  const springTransition = { type: "spring" as const, stiffness: 100, damping: 20 };

  const variants = {
    initial: { opacity: 0, x: 50, scale: 0.95 },
    animate: { opacity: 1, x: 0, scale: 1 },
    exit: { opacity: 0, x: -50, scale: 0.95 }
  };

  if (!isMounted) return null;

  const isGenerating = !isCommitting && step === 4;

  return (
    <div style={isGenerating ? { ...styles.page, ...styles.generatingPage } : styles.page}>
      {isGenerating && (
        <style>{`
          body.loreloom-generating [data-loreloom-navbar] {
            display: none !important;
          }

          body.loreloom-generating [data-loreloom-shell-main] {
            padding-top: 0 !important;
          }

          body.loreloom-generating [data-loreloom-shell-footer] {
            display: none !important;
          }
        `}</style>
      )}
      {/* Spotlight Background */}
      <div 
        style={{
          position: "absolute",
          top: 0, left: 0, right: 0, bottom: 0,
          background: `radial-gradient(circle at ${mousePos.x}px ${mousePos.y}px, rgba(176,38,255,0.06) 0%, rgba(0,0,0,0) 50%)`,
          zIndex: 0,
          pointerEvents: "none",
          transition: "background 0.1s ease"
        }} 
      />
      <div className="blueprint-grid" />

      <div style={{ ...styles.container, maxWidth: (step === 5 && !isCommitting) ? "1400px" : "900px" }}>
        <AnimatePresence mode="wait">
          {isCommitting && (
            <motion.div
              key="committingLoader"
              variants={variants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={springTransition}
              style={{ ...styles.stepCard, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "450px" }}
            >
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%" }}>
                {error ? (
                  <div style={{ color: "#ff4a4a", fontSize: "0.95rem", maxWidth: "500px", textAlign: "center", fontFamily: "var(--font-mono)", padding: "20px", background: "rgba(255,0,0,0.05)", border: "1px solid rgba(255,0,0,0.15)", borderRadius: "8px" }}>
                    <p style={{ margin: "0 0 10px 0", fontWeight: "bold" }}>On-Chain Minting Error</p>
                    <p style={{ margin: 0, opacity: 0.8, fontSize: "0.85rem" }}>{error}</p>
                    <button onClick={() => setIsCommitting(false)} style={{ marginTop: "14px", padding: "6px 14px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "4px", color: "#fff", cursor: "pointer" }}>
                      Dismiss
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
                    <div className="loader-wrapper">
                      <span className="loader-letter">C</span>
                      <span className="loader-letter">o</span>
                      <span className="loader-letter">m</span>
                      <span className="loader-letter">m</span>
                      <span className="loader-letter">i</span>
                      <span className="loader-letter">t</span>
                      <span className="loader-letter">t</span>
                      <span className="loader-letter">i</span>
                      <span className="loader-letter">n</span>
                      <span className="loader-letter">g</span>
                      <div className="loader" />
                    </div>
                    <div style={{ fontSize: "0.65rem", fontFamily: "var(--font-mono)", color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em" }}>
                      {progress}%
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {!isCommitting && step === 1 && (
            <motion.div key="step1" variants={variants} initial="initial" animate="animate" exit="exit" transition={springTransition} style={styles.stepCard}>
              <h2 style={styles.title}>Heritage Category</h2>
              <p style={styles.subtitle}>Choose the type of Karnataka heritage to explore and preserve.</p>
              
              <div style={styles.cardsGrid}>
                {SPECIES_OPTIONS.map((spec) => {
                  const Icon = spec.icon;
                  const isSelected = genesisData.species === spec.id;
                  return (
                    <div 
                      key={spec.id} 
                      onClick={() => {
                        updateData("species", spec.id);
                        setTimeout(() => {
                          setStep((prev) => (prev === 1 ? 2 : prev));
                        }, 300);
                      }}
                      style={{
                        ...styles.optionCard,
                        borderColor: isSelected ? "var(--accent-purple)" : "var(--card-border)",
                        background: isSelected ? "rgba(176,38,255,0.1)" : "var(--card-bg)"
                      }}
                    >
                      <Icon size={32} color={isSelected ? "var(--accent-purple)" : "var(--text-secondary)"} style={{ marginBottom: "16px" }} />
                      <h3 style={styles.optionTitle}>{spec.label}</h3>
                      <p style={styles.optionDesc}>{spec.desc}</p>
                    </div>
                  );
                })}
              </div>
              <div style={{...styles.navRow, justifyContent: "flex-end"}}>
                {genesisData.species && <button onClick={handleNext} style={styles.navBtn}>Next</button>}
              </div>
            </motion.div>
          )}

          {!isCommitting && step === 2 && (
            <motion.div key="step2" variants={variants} initial="initial" animate="animate" exit="exit" transition={springTransition} style={styles.stepCard}>
              <h2 style={styles.title}>The Aesthetic</h2>
              <p style={styles.subtitle}>Select the visual style rooted in Karnataka's heritage for your experience.</p>
              
              <div style={{ ...styles.cardsGrid, gridTemplateColumns: "1fr 1fr" }}>
                {STYLE_PRESETS.map((preset) => {
                  const isSelected = genesisData.style === preset.name;
                  return (
                    <div 
                      key={preset.id} 
                      onClick={() => {
                        updateData("style", preset.name);
                        setTimeout(() => {
                          setStep((prev) => (prev === 2 ? 3 : prev));
                        }, 300);
                      }}
                      style={{
                        ...styles.presetCard,
                        borderColor: isSelected ? preset.accent : "var(--card-border)",
                        boxShadow: isSelected ? `0 0 20px ${preset.accent}40` : "none",
                      }}
                    >
                      <div style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "12px",
                        background: `linear-gradient(0deg, rgba(0,0,0,0.2), rgba(0,0,0,0.2)), url(${preset.bgImage})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        border: `1px solid ${isSelected ? preset.accent : 'hsl(var(--border))'}`,
                        boxShadow: isSelected ? `0 0 15px ${preset.accent}40` : "none",
                        transition: "all 0.3s ease",
                        flexShrink: 0
                      }} />
                      <div>
                        <h3 style={{...styles.optionTitle, color: isSelected ? preset.accent : "hsl(var(--foreground))"}}>{preset.name}</h3>
                        <p style={styles.optionDesc}>{preset.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{...styles.navRow, justifyContent: "space-between"}}>
                <button onClick={handleBack} style={styles.navBtn}>Back</button>
                {genesisData.style && <button onClick={handleNext} style={styles.navBtn}>Next</button>}
              </div>
            </motion.div>
          )}

          {!isCommitting && step === 3 && (
            <motion.div key="step3" variants={variants} initial="initial" animate="animate" exit="exit" transition={springTransition} style={styles.stepCard}>
              <h2 style={styles.title}>The Heritage Prompt</h2>
              <p style={styles.subtitle}>Describe the heritage subject, historical event, folklore, or cultural tradition to bring to life.</p>
              
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "40px", height: "80px", position: "relative" }}>
                <div style={{ position: "relative", width: "80px", height: "80px", filter: "blur(15px)" }}>
                  <motion.div
                    animate={{ x: [-15, 20, -15], y: [-15, 20, -15], scale: [1, 1.3, 1] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                    style={{ position: "absolute", top: 0, left: 0, width: "70px", height: "70px", background: "#ff007f", borderRadius: "50%", opacity: 0.9, mixBlendMode: "screen" }}
                  />
                  <motion.div
                    animate={{ x: [15, -20, 15], y: [-20, 15, -20], scale: [1.3, 1, 1.3] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                    style={{ position: "absolute", top: "10px", left: "10px", width: "70px", height: "70px", background: "#007fff", borderRadius: "50%", opacity: 0.9, mixBlendMode: "screen" }}
                  />
                  <motion.div
                    animate={{ x: [-10, 10, -10], y: [20, -15, 20], scale: [1, 1.4, 1] }}
                    transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                    style={{ position: "absolute", top: "5px", left: "15px", width: "65px", height: "65px", background: "#7f00ff", borderRadius: "50%", opacity: 0.9, mixBlendMode: "screen" }}
                  />
                </div>
              </div>
              <div style={{...styles.promptContainer, position: "relative", borderRadius: "16px", overflow: "hidden", padding: "1px", display: "flex", flexDirection: "column"}}>
                {/* Animated Gradient Border */}
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                  style={{
                    position: "absolute",
                    top: "-50%",
                    left: "-50%",
                    width: "200%",
                    height: "200%",
                    background: `conic-gradient(from 0deg, transparent 0%, ${glowColor} 30%, transparent 40%, ${glowColor} 70%, transparent 80%)`,
                    zIndex: 0,
                    opacity: 1,
                  }}
                />
                <div style={{ position: "relative", zIndex: 1, background: "var(--card-bg)", border: "1px solid hsl(var(--border))", backdropFilter: "blur(24px)", borderRadius: "15px", width: "100%", flex: 1, display: "flex", flexDirection: "column" }}>
                  <textarea
                    style={{
                      ...styles.promptTextarea,
                      border: "none",
                      borderBottom: "none",
                      borderRadius: "15px",
                      background: "transparent",
                      padding: "20px",
                      paddingBottom: "60px",
                      minHeight: "160px",
                      fontSize: "1.05rem",
                      boxShadow: "none",
                      outline: "none",
                      resize: "none",
                      color: "hsl(var(--foreground))",
                      display: "block",
                      width: "100%"
                    }}
                    placeholder="Describe a heritage subject — e.g., Hampi's ruined temples, the legend of Madhuri, Yakshagana performances, or Mysore Dasara traditions..."
                    value={genesisData.prompt || ''}
                    onChange={(e) => updateData("prompt", e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (genesisData.prompt) {
                          startSynthesis();
                        }
                      }
                    }}
                    autoFocus
                  />
                  <div style={{ position: "absolute", bottom: "16px", left: "16px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", background: "var(--card-bg)", padding: "6px 10px", borderRadius: "6px", border: "1px solid hsl(var(--border))", lineHeight: 1.4 }}>
                      Image input not supported by the current AI model. Use text only.
                    </div>
                  </div>
                </div>
              </div>

              <div style={{...styles.navRow, justifyContent: "space-between"}}>
                <button onClick={handleBack} style={styles.navBtn}>Back</button>
                <button 
                  onClick={startSynthesis} 
                  disabled={!genesisData.prompt}
                  style={{
                    ...styles.navBtnPrimary,
                    opacity: genesisData.prompt ? 1 : 0.5,
                    boxShadow: `0 0 20px ${glowColor}`
                  }}
                >
                  Begin Heritage Journey
                </button>
              </div>
            </motion.div>
          )}

          {!isCommitting && step === 4 && (
            <motion.div 
              key="step4" 
              variants={variants} 
              initial="initial" 
              animate="animate" 
              exit="exit" 
              transition={springTransition} 
              style={styles.processingCard}
            >
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: "360px", gap: "20px" }}>
                <div className="loader-wrapper" style={{ marginBottom: error ? "20px" : 0 }}>
                  <span className="loader-letter">G</span>
                  <span className="loader-letter">e</span>
                  <span className="loader-letter">n</span>
                  <span className="loader-letter">e</span>
                  <span className="loader-letter">r</span>
                  <span className="loader-letter">a</span>
                  <span className="loader-letter">t</span>
                  <span className="loader-letter">i</span>
                  <span className="loader-letter">n</span>
                  <span className="loader-letter">g</span>
                  {!error && <div className="loader" />}
                </div>
                {!error && (
                  <div style={{ fontSize: "0.65rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)", letterSpacing: "0.1em" }}>
                    {progress}%
                  </div>
                )}
                {error && (
                  <div style={{ color: "#ff4a4a", fontSize: "0.95rem", maxWidth: "500px", textAlign: "center", fontFamily: "var(--font-mono)", padding: "20px", background: "rgba(255,0,0,0.05)", border: "1px solid rgba(255,0,0,0.15)", borderRadius: "8px", marginTop: "10px" }}>
                    <p style={{ margin: "0 0 10px 0", fontWeight: "bold" }}>AI Synthesis Error</p>
                    <p style={{ margin: 0, opacity: 0.8, fontSize: "0.85rem" }}>{error}</p>
                    <button onClick={() => setStep(3)} style={{ marginTop: "14px", padding: "6px 14px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "4px", color: "#fff", cursor: "pointer" }}>
                      Go Back
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {!isCommitting && step === 5 && aiOutput && (
            <motion.div key="step5" variants={variants} initial="initial" animate="animate" exit="exit" transition={springTransition} style={styles.confirmationCard}>
              <div style={styles.splitHeader}>
                <div>
                  <h2 style={styles.title}>Heritage Experience Ready</h2>
                  <p style={{...styles.subtitle, color: "var(--text-secondary)", marginTop: "8px", marginBottom: 0}}>Review the cultural narrative before preserving it on-chain.</p>
                </div>
                <button 
                  onClick={() => setViewMode(v => v === "ui" ? "json" : "ui")}
                  style={styles.toggleBtn}
                >
                  {viewMode === "ui" ? <Code size={16}/> : <User size={16}/>}
                  {viewMode === "ui" ? "Raw JSON" : "Formatted UI"}
                </button>
              </div>

              <div style={styles.splitContent}>
                {viewMode === "ui" ? (
                  <div style={styles.splitContentLayout}>
                    {/* Left Column: Refine Panel */}
                    <div className="hide-scrollbar" style={styles.leftRefinePanel}>
                      <div style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        gap: "8px", 
                        color: "hsl(var(--foreground))", 
                        fontWeight: 600, 
                        fontSize: "0.85rem",
                        textTransform: "uppercase", 
                        letterSpacing: "0.05em",
                        borderBottom: "1px solid hsl(var(--border))", 
                        paddingBottom: "12px", 
                        marginBottom: "12px" 
                      }}>
                        <Sparkles size={14} style={{ color: "var(--accent-cyan)" }} />
                        <span>AI Command Panel</span>
                      </div>
                      
                      {/* Chat History Panel */}
                      <div style={{ 
                        flex: 1, 
                        overflowY: "auto", 
                        display: "flex", 
                        flexDirection: "column", 
                        gap: "12px", 
                        padding: "4px", 
                        fontSize: "0.85rem",
                        marginBottom: "16px"
                      }}>
                        {chatHistory.length === 0 && (
                          <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", color: "var(--text-secondary)", fontStyle: "italic", textAlign: "center", opacity: 0.5 }}>
                            Select a parameter from the tree to begin refining the canon.
                          </div>
                        )}
                        {chatHistory.map((chat, idx) => (
                          <div key={idx} style={{ 
                            alignSelf: chat.role === "user" ? "flex-end" : "flex-start", 
                            background: chat.role === "user" ? "rgba(0, 214, 255, 0.12)" : "var(--card-bg)", 
                            border: chat.role === "user" ? "1px solid rgba(0, 214, 255, 0.2)" : "1px solid hsl(var(--border))",
                            borderRadius: "8px", 
                            padding: "10px 14px", 
                            maxWidth: "90%",
                            color: chat.role === "user" ? "#00D6FF" : "hsl(var(--foreground))",
                            lineHeight: "1.5"
                          }}>
                            {chat.content}
                          </div>
                        ))}
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "auto" }}>
                        {/* The Distinct Dark Prompt Box Container */}
                        <div 
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDraggingOver(true);
                          }}
                          onDragLeave={() => setIsDraggingOver(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDraggingOver(false);
                            try {
                              const json = e.dataTransfer.getData("application/json");
                              if (json) {
                                const node = JSON.parse(json) as { path: string; label: string; value: string };
                                setSelectedNodes((prev) => {
                                  const exists = prev.some((n) => n.path === node.path);
                                  if (!exists) return [...prev, node];
                                  return prev;
                                });
                                setRefinePrompt((prev) => {
                                  const prefix = `Refine [${node.label}]: `;
                                  if (!prev.includes(prefix)) return prefix + prev;
                                  return prev;
                                });
                              }
                            } catch (err) {
                              console.error("Drop error:", err);
                            }
                          }}
                          style={{
                            border: isDraggingOver
                              ? "2px dashed var(--accent-cyan)"
                              : isPromptFocused 
                                ? "1px solid rgba(176, 38, 255, 0.4)" 
                                : "1px solid hsl(var(--border))",
                            borderRadius: "10px",
                            background: isDraggingOver ? "rgba(0, 214, 255, 0.04)" : "var(--card-bg)",
                            padding: "16px",
                            boxShadow: isPromptFocused 
                              ? "0 12px 40px rgba(0, 0, 0, 0.75), 0 0 20px rgba(176, 38, 255, 0.12)" 
                              : "0 8px 32px rgba(0, 0, 0, 0.6), 0 0 15px rgba(255, 255, 255, 0.03)",
                            display: "flex",
                            flexDirection: "column",
                            position: "relative",
                            transition: "all 0.2s ease"
                          }}
                        >
                          {isDraggingOver && (
                            <div style={{
                              position: "absolute",
                              top: 0, left: 0, right: 0, bottom: 0,
                              background: "rgba(0, 214, 255, 0.08)",
                              backdropFilter: "blur(4px)",
                              display: "flex",
                              justifyContent: "center",
                              alignItems: "center",
                              color: "var(--accent-cyan)",
                              fontSize: "0.9rem",
                              fontWeight: "bold",
                              letterSpacing: "0.05em",
                              borderRadius: "10px",
                              pointerEvents: "none",
                              zIndex: 10
                            }}>
                              Drop parameter to refine
                            </div>
                          )}
                          <textarea
                            className="hide-scrollbar"
                            style={{
                              width: "100%",
                              minHeight: "48px",
                              border: "none",
                              outline: "none",
                              background: "transparent",
                              color: "hsl(var(--foreground))",
                              fontSize: "0.95rem",
                              fontFamily: "var(--font-inter)",
                              resize: "none",
                              padding: 0,
                              marginBottom: "8px"
                            }}
                            placeholder={selectedNodes.length > 0 ? `Describe refinement for ${selectedNodes.map(n => n.label).join(", ")}...` : "Describe refinements to the story canon..."}
                            value={refinePrompt}
                            onChange={(e) => setRefinePrompt(e.target.value)}
                            onFocus={() => setIsPromptFocused(true)}
                            onBlur={() => setIsPromptFocused(false)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                executeRefinement();
                              }
                            }}
                          />
                          
                          {/* Inner Action Row */}
                          <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            borderTop: "1px solid hsl(var(--border))",
                            paddingTop: "12px",
                            marginTop: "8px"
                          }}>
                            {/* Left Controls */}
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", padding: "2px 6px", lineHeight: 1.3, flexShrink: 0 }}>
                                Image input not supported
                              </div>

                              {selectedNodes.map((node) => (
                                <div 
                                  key={node.path}
                                  style={{
                                    background: "hsl(var(--background))",
                                    border: "1px solid hsl(var(--border))",
                                    color: "hsl(var(--foreground))",
                                    borderRadius: "6px",
                                    padding: "3px 8px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    fontSize: "0.75rem",
                                    fontWeight: 500,
                                    fontFamily: "var(--font-inter)",
                                    flexShrink: 0
                                  }}
                                >
                                  <Sparkles size={10} style={{ color: "var(--accent-cyan)" }} />
                                  <span>{node.label}</span>
                                  <button 
                                    onClick={() => toggleNodeSelection(node)}
                                    style={{
                                      background: "transparent",
                                      border: "none",
                                      color: "var(--text-muted)",
                                      cursor: "pointer",
                                      padding: 0,
                                      display: "flex",
                                      alignItems: "center",
                                      transition: "color 0.2s"
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.color = "hsl(var(--foreground))"}
                                    onMouseOut={(e) => e.currentTarget.style.color = "var(--text-muted)"}
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              ))}
                            </div>

                            {/* Right Controls */}
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                              <button
                                onClick={executeRefinement}
                                disabled={isRefining || !refinePrompt.trim()}
                                style={{
                                  width: "32px",
                                  height: "32px",
                                  borderRadius: "6px",
                                  background: (isRefining || !refinePrompt.trim()) 
                                    ? "hsl(var(--background))" 
                                    : "linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))",
                                  color: (isRefining || !refinePrompt.trim()) ? "var(--text-muted)" : "#ffffff",
                                  border: (isRefining || !refinePrompt.trim()) ? "1px solid hsl(var(--border))" : "none",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  cursor: (isRefining || !refinePrompt.trim()) ? "default" : "pointer",
                                  boxShadow: (isRefining || !refinePrompt.trim()) ? "none" : "0 0 10px rgba(0, 214, 255, 0.3)",
                                  transition: "all 0.2s ease"
                                }}
                              >
                                {isRefining ? (
                                  <motion.div 
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    style={{ width: "12px", height: "12px", border: "2px solid rgba(255, 255, 255, 0.5)", borderTopColor: "transparent", borderRadius: "50%" }}
                                  />
                                ) : (
                                  <ArrowUp size={16} />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Tree Plan Panel */}
                    {renderTree()}
                  </div>
                ) : (
                  <div style={styles.jsonView}>
                    <pre style={styles.preCode}>
                      {JSON.stringify(aiOutput, null, 2)}
                    </pre>
                    <div style={styles.promptDebug}>
                      <strong>Prompt sent to LLM:</strong>
                      <p style={{marginTop:"8px"}}>
                        &quot;You are the Loreloom Heritage Composer. Based on the user&apos;s choices (Heritage Category: {genesisData.species}, Visual Style: {genesisData.style}) and their heritage input: &apos;{genesisData.prompt}&apos;, generate a structured JSON object describing the cultural experience...&quot;
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div style={{...styles.navRow, position: "absolute", bottom: 0, left: 0, right: 0, padding: "20px 40px", borderTop: "1px solid hsl(var(--border))", background: "var(--card-bg)", backdropFilter: "blur(10px)", marginTop: 0, justifyContent: "space-between"}}>
                <button onClick={() => setStep(3)} style={{
                  ...styles.navBtn, 
                  padding: "10px 24px", 
                  fontSize: "0.95rem", 
                  border: "1px solid hsl(var(--border))", 
                  borderRadius: "4px"
                }}>
                  Edit Heritage Prompt
                </button>
                 <button 
                   onClick={confirmGenesis} 
                   disabled={isCommitting}
                   style={{
                     ...styles.navBtnPrimary, 
                     padding: "10px 24px", 
                     fontSize: "0.95rem", 
                     borderRadius: "4px",
                     opacity: isCommitting ? 0.6 : 1,
                     cursor: isCommitting ? "not-allowed" : "pointer"
                   }}
                 >
                   {isCommitting ? (
                     <>
                       <span style={{ 
                         width: "12px", 
                         height: "12px", 
                         marginRight: "8px", 
                         display: "inline-block", 
                         border: "2px solid rgba(255,255,255,0.2)", 
                         borderTop: "2px solid #fff", 
                         borderRadius: "50%", 
                         animation: "loader-rotate 1s linear infinite",
                         verticalAlign: "middle"
                       }} />
                       Confirming...
                     </>
                   ) : (
                     <>
                       <Database size={16} style={{marginRight: "6px", verticalAlign: "middle"}} />
                       Confirm & Preserve
                     </>
                   )}
                 </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Custom Project Limit Alert Modal */}
        <AnimatePresence>
          {showLimitAlert && (
            <div style={{
              position: "fixed",
              top: 0, left: 0, right: 0, bottom: 0,
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(4px)",
              zIndex: 1000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                style={{
                  background: "var(--card-bg)",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "16px",
                  padding: "32px",
                  maxWidth: "400px",
                  width: "100%",
                  boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
                  textAlign: "center"
                }}
              >
                <h3 style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: "16px", fontFamily: "var(--font-sans)", color: "var(--accent-orange)" }}>Upgrade to Pro</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "32px", lineHeight: 1.5 }}>
                  Free tier allows a maximum of 2 active projects. Upgrade to Pro for unlimited access.
                </p>

                <div style={{ display: "flex", justifyContent: "center" }}>
                  <button 
                    onClick={() => {
                      setShowLimitAlert(false);
                      router.push("/dashboard");
                    }}
                    style={{
                      background: "var(--accent-orange)",
                      border: "none",
                      color: "#fff",
                      padding: "10px 32px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontFamily: "var(--font-inter)",
                      fontWeight: 500
                    }}
                  >
                    Back to Dashboard
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "calc(100vh - var(--nav-height))",
    background: "hsl(var(--background))",
    color: "hsl(var(--foreground))",
    position: "relative",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: "24px",
    paddingBottom: "80px",
    fontFamily: "var(--font-inter)",
  },
  generatingPage: {
    minHeight: "100vh",
    justifyContent: "center",
    paddingTop: 0,
    paddingBottom: 0,
  },
  container: {
    width: "100%",
    maxWidth: "900px",
    position: "relative",
    zIndex: 1,
    padding: "0 24px"
  },
  stepCard: {
    width: "100%",
  },
  processingCard: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center"
  },
  confirmationCard: {
    width: "100%",
    background: "var(--card-bg)",
    border: "1px solid hsl(var(--border))",
    borderRadius: "12px",
    padding: "32px",
    paddingBottom: "100px",
    boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
    position: "relative",
    overflow: "hidden"
  },
  title: {
    fontSize: "2.5rem",
    fontWeight: 700,
    marginBottom: "8px",
    fontFamily: "var(--font-sans)",
    letterSpacing: "-0.02em"
  },
  subtitle: {
    fontSize: "1rem",
    color: "var(--text-secondary)",
    marginBottom: "40px"
  },
  cardsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "24px"
  },
  optionCard: {
    padding: "32px",
    borderRadius: "16px",
    border: "1px solid",
    cursor: "pointer",
    transition: "all 0.2s ease",
    display: "flex",
    flexDirection: "column"
  },
  optionTitle: {
    fontSize: "1.1rem",
    fontWeight: 600,
    marginBottom: "8px"
  },
  optionDesc: {
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
    lineHeight: 1.5
  },
  presetCard: {
    padding: "24px",
    borderRadius: "16px",
    border: "1px solid",
    cursor: "pointer",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
    gap: "20px",
    background: "var(--card-bg)"
  },
  presetThumb: {
    width: "48px",
    height: "48px",
    borderRadius: "12px",
    border: "1px solid",
    flexShrink: 0
  },
  promptContainer: {
    width: "100%",
    marginBottom: "40px"
  },
  promptTextarea: {
    width: "100%",
    background: "transparent",
    border: "none",
    borderBottom: "2px solid",
    color: "hsl(var(--foreground))",
    fontSize: "1.5rem",
    fontFamily: "var(--font-sans)",
    padding: "20px 0",
    minHeight: "150px",
    resize: "none",
    outline: "none",
    transition: "all 0.3s ease"
  },
  navRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "20px"
  },
  navBtn: {
    background: "transparent",
    color: "var(--text-secondary)",
    border: "none",
    fontSize: "1rem",
    cursor: "pointer",
    padding: "12px 0",
    transition: "color 0.2s"
  },
  navBtnPrimary: {
    background: "hsl(var(--foreground))",
    color: "hsl(var(--background))",
    border: "1px solid hsl(var(--border))",
    padding: "12px 32px",
    borderRadius: "100px",
    fontSize: "1rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    whiteSpace: "nowrap"
  },
  splitHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "16px",
    borderBottom: "1px solid hsl(var(--border))",
    paddingBottom: "12px"
  },
  toggleBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#fff",
    padding: "8px 16px",
    borderRadius: "8px",
    cursor: "pointer",
    fontFamily: "var(--font-mono)",
    fontSize: "0.85rem"
  },
  splitContent: {
    minHeight: "200px"
  },
  uiView: {
    display: "flex",
    flexDirection: "column",
    gap: "24px"
  },
  uiSection: {
    background: "rgba(0,0,0,0.3)",
    padding: "20px",
    borderRadius: "12px"
  },
  uiHeader: {
    fontSize: "0.9rem",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "var(--accent-cyan)",
    marginBottom: "12px"
  },
  tagsRow: {
    display: "flex",
    gap: "8px",
    marginTop: "16px"
  },
  traitTag: {
    background: "rgba(255,255,255,0.1)",
    padding: "4px 10px",
    borderRadius: "100px",
    fontSize: "0.75rem",
    fontFamily: "var(--font-mono)"
  },
  factsList: {
    paddingLeft: "20px",
    lineHeight: 1.6
  },
  jsonView: {
    display: "flex",
    flexDirection: "column",
    gap: "24px"
  },
  preCode: {
    background: "var(--card-bg)",
    padding: "20px",
    borderRadius: "12px",
    fontFamily: "var(--font-mono)",
    fontSize: "0.85rem",
    color: "#a78bfa",
    overflowX: "auto"
  },
  promptDebug: {
    background: "rgba(176,38,255,0.1)",
    borderLeft: "3px solid var(--accent-purple)",
    padding: "16px",
    fontSize: "0.9rem",
    color: "var(--text-secondary)"
  },
  splitContentLayout: {
    display: "grid",
    gridTemplateColumns: "40% 1fr",
    gap: "32px",
    width: "100%",
    marginTop: "24px",
    alignItems: "stretch"
  },
  leftRefinePanel: {
    background: "var(--card-bg)",
    border: "1px solid rgba(176, 38, 255, 0.22)",
    borderRadius: "8px",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    textAlign: "left",
    width: "100%",
    height: "600px",
    overflowY: "auto",
    boxShadow: "0 4px 24px rgba(176, 38, 255, 0.03)"
  },
  rightTreePanel: {
    background: "var(--card-bg)",
    border: "1px solid rgba(0, 214, 255, 0.22)",
    borderRadius: "8px",
    padding: "24px",
    textAlign: "left",
    height: "600px",
    overflowY: "auto" as any,
    boxShadow: "0 4px 24px rgba(0, 214, 255, 0.03)"
  },
  treeNode: {
    padding: "10px 14px",
    borderRadius: "8px",
    cursor: "pointer",
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    fontSize: "0.92rem",
    fontFamily: "var(--font-inter)",
    color: "hsl(var(--foreground))",
    lineHeight: "1.5",
    transition: "all 0.2s ease"
  },
  treeBranch: {
    marginLeft: "24px",
    borderLeft: "1px dashed rgba(255, 255, 255, 0.1)",
    paddingLeft: "16px",
    marginTop: "6px",
    display: "flex",
    flexDirection: "column",
    gap: "6px"
  },
  refinementTextarea: {
    width: "100%",
    minHeight: "120px",
    padding: "12px",
    borderRadius: "8px",
    background: "transparent",
    border: "none",
    color: "hsl(var(--foreground))",
    fontSize: "0.9rem",
    outline: "none",
    resize: "none",
    fontFamily: "var(--font-sans)",
    transition: "all 0.2s ease"
  },
  refineSubmitBtn: {
    background: "var(--accent-purple)",
    color: "#fff",
    padding: "10px 16px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    fontSize: "0.9rem",
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    transition: "all 0.2s ease"
  }
};
