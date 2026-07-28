"use client";

import React from "react";

interface VectorIllustrationProps {
  seed: string;
  className?: string;
  style?: React.CSSProperties;
}

export const VectorIllustration: React.FC<VectorIllustrationProps> = ({ seed, className, style }) => {
  const getIllustration = () => {
    switch (seed) {
      case "grid-nodes":
        return (
          <svg viewBox="0 0 400 300" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#ec4899" stopOpacity="0.2" />
              </linearGradient>
              <radialGradient id="glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#030306" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width="100%" height="100%" fill="#0a0a14" />
            <circle cx="200" cy="150" r="120" fill="url(#glow)" />
            {/* Grid Lines */}
            <path d="M 50 0 L 50 300 M 100 0 L 100 300 M 150 0 L 150 300 M 200 0 L 200 300 M 250 0 L 250 300 M 300 0 L 300 300 M 350 0 L 350 300" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
            <path d="M 0 50 L 400 50 M 0 100 L 400 100 M 0 150 L 400 150 M 0 200 L 400 200 M 0 250 L 400 250" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
            
            {/* Cyberpunk Circuit Grid */}
            <path d="M 50 50 L 150 50 L 200 100 L 200 200 L 250 250 L 350 250" fill="none" stroke="url(#purpleGrad)" strokeWidth="2" strokeDasharray="5,5" />
            <path d="M 100 250 L 150 200 L 150 100 L 250 50" fill="none" stroke="#06b6d4" strokeWidth="1.5" opacity="0.6" />
            <path d="M 300 50 L 300 150 L 250 200 L 100 200" fill="none" stroke="#fbbf24" strokeWidth="1" opacity="0.5" />
            
            {/* Glowing nodes */}
            <circle cx="150" cy="50" r="4" fill="#8b5cf6" filter="drop-shadow(0 0 6px #8b5cf6)" />
            <circle cx="200" cy="100" r="5" fill="#ec4899" filter="drop-shadow(0 0 8px #ec4899)" />
            <circle cx="250" cy="250" r="4" fill="#8b5cf6" />
            <circle cx="150" cy="200" r="3" fill="#06b6d4" />
            <circle cx="250" cy="50" r="4" fill="#06b6d4" filter="drop-shadow(0 0 6px #06b6d4)" />
            <circle cx="250" cy="200" r="5" fill="#fbbf24" filter="drop-shadow(0 0 6px #fbbf24)" />
            
            {/* Central Hologram Wireframe */}
            <g transform="translate(200, 150)">
              <polygon points="0,-40 35,-20 35,20 0,40 -35,20 -35,-20" fill="none" stroke="#8b5cf6" strokeWidth="2" opacity="0.8" />
              <polygon points="0,-25 22,-12 22,12 0,25 -22,12 -22,-12" fill="none" stroke="#06b6d4" strokeWidth="1" opacity="0.6" />
              <line x1="0" y1="-40" x2="0" y2="40" stroke="#8b5cf6" strokeWidth="1" opacity="0.3" />
              <line x1="-35" y1="20" x2="35" y2="-20" stroke="#8b5cf6" strokeWidth="1" opacity="0.3" />
              <line x1="-35" y1="-20" x2="35" y2="20" stroke="#8b5cf6" strokeWidth="1" opacity="0.3" />
            </g>
          </svg>
        );

      case "digital-cathedral":
        return (
          <svg viewBox="0 0 400 300" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="cyanGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#ec4899" stopOpacity="0.1" />
              </linearGradient>
            </defs>
            <style>
              {`
                @keyframes pulse-ray {
                  0%, 100% { opacity: 0.25; }
                  50% { opacity: 0.45; }
                }
                @keyframes float-spire {
                  0%, 100% { transform: translateY(0px); }
                  50% { transform: translateY(-8px); }
                }
                .ray-1 { animation: pulse-ray 4s ease-in-out infinite; }
                .ray-2 { animation: pulse-ray 5s ease-in-out infinite 1s; }
                .ray-3 { animation: pulse-ray 6s ease-in-out infinite 2s; }
                .spire { animation: float-spire 6s ease-in-out infinite; }
              `}
            </style>
            <rect width="100%" height="100%" fill="#06060c" />
            {/* Light Rays */}
            <polygon className="ray-1" points="120,300 200,0 280,300" fill="url(#cyanGrad)" />
            <polygon className="ray-2" points="60,300 200,50 140,300" fill="url(#cyanGrad)" />
            <polygon className="ray-3" points="340,300 200,50 260,300" fill="url(#cyanGrad)" />
            
            {/* Isometric Code Pillars */}
            <g transform="translate(100, 180)">
              {/* Left Pillar */}
              <polygon points="0,-40 30,-55 60,-40 60,80 30,95 0,80" fill="rgba(13, 13, 25, 0.9)" stroke="#06b6d4" strokeWidth="1.5" />
              <polygon points="30,-55 60,-40 30,-25 0,-40" fill="rgba(6, 182, 212, 0.2)" stroke="#06b6d4" strokeWidth="1" />
              <line x1="30" y1="-25" x2="30" y2="95" stroke="#06b6d4" strokeWidth="1" opacity="0.5" />
            </g>
            
            <g transform="translate(240, 180)">
              {/* Right Pillar */}
              <polygon points="0,-60 30,-75 60,-60 60,80 30,95 0,80" fill="rgba(13, 13, 25, 0.9)" stroke="#8b5cf6" strokeWidth="1.5" />
              <polygon points="30,-75 60,-60 30,-45 0,-60" fill="rgba(139, 92, 246, 0.2)" stroke="#8b5cf6" strokeWidth="1" />
              <line x1="30" y1="-45" x2="30" y2="95" stroke="#8b5cf6" strokeWidth="1" opacity="0.5" />
            </g>

            <g transform="translate(170, 120)" className="spire">
              {/* Central Floating Spire */}
              <polygon points="0,-80 30,-95 60,-80 60,20 30,35 0,20" fill="rgba(20, 10, 30, 0.9)" stroke="#ec4899" strokeWidth="2" />
              <polygon points="30,-95 60,-80 30,-65 0,-80" fill="rgba(236, 72, 153, 0.3)" stroke="#ec4899" strokeWidth="1" />
              <line x1="30" y1="-65" x2="30" y2="35" stroke="#ec4899" strokeWidth="1" opacity="0.6" />
              <circle cx="30" cy="-65" r="3" fill="#ffffff" filter="drop-shadow(0 0 5px #ffffff)" />
            </g>
            
            {/* Ambient code streams */}
            <path d="M 30,50 L 70,50" stroke="#06b6d4" strokeWidth="2" opacity="0.8" strokeDasharray="5,5" className="code-flow-1" />
            <path d="M 30,65 L 50,65" stroke="#06b6d4" strokeWidth="2" opacity="0.8" strokeDasharray="2,4" className="code-flow-2" />
            <path d="M 330,80 L 370,80" stroke="#f97316" strokeWidth="2" opacity="0.8" strokeDasharray="5,5" className="code-flow-1" />
            <path d="M 350,95 L 370,95" stroke="#f97316" strokeWidth="2" opacity="0.8" strokeDasharray="2,4" className="code-flow-2" />
            <style>
              {`
                @keyframes code-flow {
                  to { stroke-dashoffset: -20; }
                }
                .code-flow-1 { animation: code-flow 2s linear infinite; }
                .code-flow-2 { animation: code-flow 1.5s linear infinite reverse; }
              `}
            </style>
          </svg>
        );

      case "floating-islands":
        return (
          <svg viewBox="0 0 400 300" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#d97706" stopOpacity="0.2" />
              </linearGradient>
              <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0b132b" />
                <stop offset="100%" stopColor="#1c2541" />
              </linearGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#skyGrad)" />
            
            {/* Sun/Aether Core */}
            <circle cx="200" cy="110" r="50" fill="rgba(251, 191, 36, 0.08)" />
            <circle cx="200" cy="110" r="30" fill="rgba(251, 191, 36, 0.15)" />
            <circle cx="200" cy="110" r="10" fill="#fbbf24" filter="drop-shadow(0 0 10px #fbbf24)" />
            
            {/* Orbital Rings */}
            <ellipse cx="200" cy="110" rx="140" ry="25" fill="none" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="1" transform="rotate(-15, 200, 110)" />
            <ellipse cx="200" cy="110" rx="90" ry="15" fill="none" stroke="url(#goldGrad)" strokeWidth="1.5" strokeDasharray="8,4" transform="rotate(10, 200, 110)" />
            
            {/* Floating Island Center */}
            <g transform="translate(140, 160)">
              <polygon points="60,0 120,25 90,60 30,60 0,25" fill="#1c2541" stroke="#fbbf24" strokeWidth="1.5" />
              <polygon points="60,0 120,25 60,35 0,25" fill="rgba(251, 191, 36, 0.2)" stroke="#fbbf24" strokeWidth="1" />
              {/* Island Spire */}
              <line x1="60" y1="0" x2="60" y2="-40" stroke="#fbbf24" strokeWidth="2" />
              <circle cx="60" cy="-40" r="4" fill="#fbbf24" filter="drop-shadow(0 0 8px #fbbf24)" />
            </g>

            {/* Minor Floating Spores */}
            <g transform="translate(80, 100)">
              <polygon points="20,0 40,8 30,20 10,20 0,8" fill="#1c2541" stroke="#06b6d4" strokeWidth="1" />
              <line x1="20" y1="0" x2="20" y2="-15" stroke="#06b6d4" strokeWidth="1" />
            </g>
            
            <g transform="translate(280, 130)">
              <polygon points="20,0 40,8 30,20 10,20 0,8" fill="#1c2541" stroke="#8b5cf6" strokeWidth="1" opacity="0.8" />
              <line x1="20" y1="0" x2="20" y2="-15" stroke="#8b5cf6" strokeWidth="1" opacity="0.8" />
            </g>
          </svg>
        );

      case "nexus-core":
        return (
          <svg viewBox="0 0 400 300" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.9" />
                <stop offset="40%" stopColor="#ec4899" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#030306" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width="100%" height="100%" fill="#04040a" />
            
            {/* Outer Rings */}
            <circle cx="200" cy="150" r="110" fill="none" stroke="rgba(139, 92, 246, 0.1)" strokeWidth="1" strokeDasharray="10, 10" />
            <circle cx="200" cy="150" r="85" fill="none" stroke="rgba(6, 182, 212, 0.2)" strokeWidth="1.5" />
            <circle cx="200" cy="150" r="60" fill="none" stroke="rgba(236, 72, 153, 0.3)" strokeWidth="2" strokeDasharray="5, 20" />
            
            {/* Glow Sphere */}
            <circle cx="200" cy="150" r="50" fill="url(#coreGlow)" />
            
            {/* Center Core Element */}
            <polygon points="200,120 226,135 226,165 200,180 174,165 174,135" fill="rgba(255,255,255,0.15)" stroke="#ffffff" strokeWidth="2.5" />
            <circle cx="200" cy="150" r="6" fill="#ffffff" filter="drop-shadow(0 0 8px #ffffff)" />

            {/* Orbiting Particles */}
            <circle cx="110" cy="100" r="3" fill="#8b5cf6" />
            <circle cx="290" cy="200" r="4" fill="#06b6d4" filter="drop-shadow(0 0 6px #06b6d4)" />
            <circle cx="260" cy="90" r="2" fill="#ec4899" />
            <circle cx="140" cy="210" r="3" fill="#fbbf24" />
          </svg>
        );

      case "cyber-portal":
        return (
          <svg viewBox="0 0 400 300" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="portalGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="50%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
            </defs>
            <rect width="100%" height="100%" fill="#020205" />
            
            {/* Hexagonal Portal Outline */}
            <g transform="translate(200, 150)">
              {/* Layer 3 */}
              <polygon points="0,-110 95,-55 95,55 0,110 -95,55 -95,-55" fill="none" stroke="rgba(6, 182, 212, 0.15)" strokeWidth="1" strokeDasharray="15,5" />
              {/* Layer 2 */}
              <polygon points="0,-90 78,-45 78,45 0,90 -78,45 -78,-45" fill="none" stroke="url(#portalGrad)" strokeWidth="2.5" />
              {/* Layer 1 (Inner) */}
              <polygon points="0,-70 60,-35 60,35 0,70 -60,35 -60,-35" fill="rgba(139, 92, 246, 0.15)" stroke="#ffffff" strokeWidth="1.5" opacity="0.8" />
              
              {/* Portal Center Glow */}
              <ellipse cx="0" cy="0" rx="35" ry="35" fill="#ffffff" filter="drop-shadow(0 0 15px #06b6d4)" opacity="0.9" />
              
              {/* Emerging Rays */}
              <line x1="0" y1="0" x2="-140" y2="-80" stroke="#06b6d4" strokeWidth="1.5" opacity="0.6" strokeDasharray="5,10" />
              <line x1="0" y1="0" x2="140" y2="80" stroke="#ec4899" strokeWidth="1.5" opacity="0.6" strokeDasharray="5,10" />
              <line x1="0" y1="0" x2="-120" y2="100" stroke="#8b5cf6" strokeWidth="1" opacity="0.4" />
              <line x1="0" y1="0" x2="120" y2="-100" stroke="#8b5cf6" strokeWidth="1" opacity="0.4" />
            </g>
          </svg>
        );

      case "aether-engine":
        return (
          <svg viewBox="0 0 400 300" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#0a0710" />
            
            {/* Gear 1 (Center-Left) */}
            <g transform="translate(160, 150)">
              <circle cx="0" cy="0" r="70" fill="none" stroke="#fbbf24" strokeWidth="2" />
              <circle cx="0" cy="0" r="50" fill="none" stroke="rgba(251, 191, 36, 0.3)" strokeWidth="1" />
              <circle cx="0" cy="0" r="20" fill="none" stroke="#fbbf24" strokeWidth="1.5" />
              {/* Gear Teeth */}
              {Array.from({ length: 12 }).map((_, i) => {
                const angle = (i * 360) / 12;
                return (
                  <rect
                    key={i}
                    x="-8"
                    y="-78"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="2"
                    transform={`rotate(${angle}, 0, 0)`}
                  />
                );
              })}
              <line x1="-70" y1="0" x2="70" y2="0" stroke="rgba(251, 191, 36, 0.4)" strokeWidth="1" />
              <line x1="0" y1="-70" x2="0" y2="70" stroke="rgba(251, 191, 36, 0.4)" strokeWidth="1" />
            </g>

            {/* Gear 2 (Top-Right, smaller) */}
            <g transform="translate(260, 100)">
              <circle cx="0" cy="0" r="40" fill="none" stroke="#8b5cf6" strokeWidth="1.5" />
              <circle cx="0" cy="0" r="10" fill="none" stroke="#8b5cf6" strokeWidth="1" />
              {/* Teeth */}
              {Array.from({ length: 8 }).map((_, i) => {
                const angle = (i * 360) / 8 + 22.5; // Offset to mesh
                return (
                  <rect
                    key={i}
                    x="-5"
                    y="-45"
                    width="10"
                    height="10"
                    fill="none"
                    stroke="#8b5cf6"
                    strokeWidth="1.5"
                    transform={`rotate(${angle}, 0, 0)`}
                  />
                );
              })}
            </g>

            {/* Connecting Pipes & Wiring */}
            <path d="M 50,150 L 90,150 L 110,130 L 110,80 L 220,80" fill="none" stroke="#06b6d4" strokeWidth="2" strokeDasharray="5,3" />
            <path d="M 230,150 L 320,150" fill="none" stroke="#8b5cf6" strokeWidth="1.5" />
            
            {/* Glowing gauge indicators */}
            <circle cx="50" cy="150" r="6" fill="#06b6d4" filter="drop-shadow(0 0 5px #06b6d4)" />
            <circle cx="320" cy="150" r="5" fill="#8b5cf6" filter="drop-shadow(0 0 5px #8b5cf6)" />
            <circle cx="220" cy="80" r="4" fill="#fbbf24" />
          </svg>
        );

      case "quantum-matrix":
        return (
          <svg viewBox="0 0 400 300" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#050807" />
            
            {/* Background binary/code columns */}
            <g fontFamily="monospace" fontSize="10" fill="rgba(6, 182, 212, 0.15)">
              <text x="20" y="30">01001101</text>
              <text x="20" y="60">10110010</text>
              <text x="20" y="90">00101101</text>
              <text x="20" y="120">11001100</text>
              <text x="20" y="150">01101001</text>
              <text x="20" y="180">10010011</text>
              <text x="20" y="210">11100010</text>
              <text x="20" y="240">01011100</text>
              
              <text x="320" y="40">1101</text>
              <text x="320" y="70">0010</text>
              <text x="320" y="100">1111</text>
              <text x="320" y="130">0101</text>
              <text x="320" y="160">1010</text>
              <text x="320" y="190">0011</text>
              <text x="320" y="220">1100</text>
              <text x="320" y="250">0110</text>
            </g>

            {/* Glowing sine/quantum waves */}
            <path d="M 0,150 Q 100,50 200,150 T 400,150" fill="none" stroke="#06b6d4" strokeWidth="2.5" opacity="0.8" />
            <path d="M 0,150 Q 100,250 200,150 T 400,150" fill="none" stroke="#8b5cf6" strokeWidth="1.5" opacity="0.6" />
            <path d="M 0,150 H 400" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="10, 10" />

            {/* Measurement points */}
            <g transform="translate(100, 100)">
              <circle cx="0" cy="0" r="8" fill="none" stroke="#06b6d4" strokeWidth="1.5" />
              <line x1="0" y1="-12" x2="0" y2="12" stroke="#06b6d4" strokeWidth="1" />
              <line x1="-12" y1="0" x2="12" y2="0" stroke="#06b6d4" strokeWidth="1" />
              <circle cx="0" cy="0" r="3" fill="#ffffff" />
            </g>

            <g transform="translate(300, 200)">
              <circle cx="0" cy="0" r="8" fill="none" stroke="#8b5cf6" strokeWidth="1.5" />
              <line x1="0" y1="-12" x2="0" y2="12" stroke="#8b5cf6" strokeWidth="1" />
              <line x1="-12" y1="0" x2="12" y2="0" stroke="#8b5cf6" strokeWidth="1" />
              <circle cx="0" cy="0" r="3" fill="#ffffff" />
            </g>
          </svg>
        );

      case "mystic-rune":
        return (
          <svg viewBox="0 0 400 300" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#0a050d" />
            
            {/* Outer Ritual Ring */}
            <g transform="translate(200, 150)">
              <circle cx="0" cy="0" r="95" fill="none" stroke="#8b5cf6" strokeWidth="1.5" />
              <circle cx="0" cy="0" r="90" fill="none" stroke="rgba(139, 92, 246, 0.3)" strokeWidth="1" strokeDasharray="6,3" />
              <circle cx="0" cy="0" r="75" fill="none" stroke="#ec4899" strokeWidth="1" />
              
              {/* Pentagram / Geometric lines */}
              <polygon points="0,-90 85,30 -53,30 -53,-60 85,-60" fill="none" stroke="rgba(236, 72, 153, 0.25)" strokeWidth="1.5" />
              <polygon points="0,-75 65,20 -40,20 -40,-45 65,-45" fill="none" stroke="rgba(139, 92, 246, 0.25)" strokeWidth="1" />
              
              {/* Inner focus */}
              <circle cx="0" cy="0" r="35" fill="none" stroke="#8b5cf6" strokeWidth="2.5" />
              <circle cx="0" cy="0" r="8" fill="#8b5cf6" filter="drop-shadow(0 0 8px #8b5cf6)" />

              {/* Satellite nodes */}
              <circle cx="0" cy="-90" r="4" fill="#8b5cf6" filter="drop-shadow(0 0 5px #8b5cf6)" />
              <circle cx="85" cy="30" r="4" fill="#ec4899" />
              <circle cx="-53" cy="30" r="4" fill="#ec4899" />
              <circle cx="-53" cy="-60" r="4" fill="#8b5cf6" />
              <circle cx="85" cy="-60" r="4" fill="#8b5cf6" />
            </g>
          </svg>
        );

      case "nebula-drift":
      default:
        return (
          <svg viewBox="0 0 400 300" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="purplePink" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#ec4899" stopOpacity="0.1" />
              </linearGradient>
              <linearGradient id="cyanPurple" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.1" />
              </linearGradient>
            </defs>
            <rect width="100%" height="100%" fill="#050308" />
            
            {/* Flowing Waves */}
            <path d="M -50,180 C 100,80 200,280 450,120 L 450,300 L -50,300 Z" fill="url(#purplePink)" opacity="0.5" />
            <path d="M -50,220 C 120,120 180,320 450,160 L 450,300 L -50,300 Z" fill="url(#cyanPurple)" opacity="0.4" />
            
            {/* Stars / sparkle details */}
            <circle cx="120" cy="80" r="1.5" fill="#fff" opacity="0.8" />
            <circle cx="280" cy="70" r="2" fill="#fff" opacity="0.9" filter="drop-shadow(0 0 4px #fff)" />
            <circle cx="340" cy="140" r="1" fill="#fff" opacity="0.5" />
            <circle cx="80" cy="190" r="1" fill="#fff" opacity="0.6" />
            <circle cx="210" cy="110" r="1.5" fill="#fff" opacity="0.7" />

            {/* Constellation line */}
            <path d="M 280,70 L 340,140 L 370,180" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
          </svg>
        );
    }
  };

  return (
    <div 
      className={`glass-panel overflow-hidden flex items-center justify-center ${className || ""}`}
      style={{ 
        width: "100%", 
        aspectRatio: "4/3",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...style 
      }}
    >
      {getIllustration()}
    </div>
  );
};
