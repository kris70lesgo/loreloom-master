"use client";

import React, { useRef, useEffect } from "react";
import Link from "next/link";
import { Upload, SquareArrowOutUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";

function NavButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="bg-transparent border-none cursor-pointer font-sans text-[15px] font-medium uppercase text-wandor-text tracking-[0.04em] transition-opacity hover:opacity-55"
    >
      {children}
    </button>
  );
}

export function Hero() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.play().catch((err) => {
        console.warn("Video playback notice:", err);
      });
    }
  }, []);

  return (
    <section className="relative h-screen w-full overflow-hidden flex flex-col justify-between">
      {/* Background Video Layer */}
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0"
      >
        <source
          src="https://pollen-batch-41236914.figma.site/_components/v2/f0ee2dae7671c170c34f12e31c4cb41418976c98/769c564298c132f7919405cd9f17c1b1231f341d.769c5642.mp4"
          type="video/mp4"
        />
      </video>

      {/* Top Gradient Overlay */}
      <div
        className="absolute inset-x-0 top-0 h-[687px] pointer-events-none z-[1]"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%)",
        }}
      />

      {/* Content Wrapper */}
      <div className="relative z-[2] max-w-[1360px] w-full mx-auto h-full flex flex-col justify-between" style={{ marginLeft: "auto", marginRight: "auto" }}>
        {/* Navigation Bar - Loreloom Brand & Assets */}
        <nav className="pt-6 pb-2 px-10 md:px-24 flex items-center justify-between relative w-full flex-shrink-0">
          {/* Left: Loreloom Logo & Wordmark */}
          <Link href="/" className="flex items-center gap-3 select-none">
            <img
              src="/favicon.svg"
              alt="Loreloom Logo"
              className="w-8 h-8 rounded-lg shadow-sm flex-shrink-0"
            />
            <span className="font-display text-[28px] md:text-[34px] text-black leading-none tracking-tight">
              Loreloom
            </span>
          </Link>

          {/* Center: absolutely centered group (hidden on mobile) */}
          <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-8">
            <NavButton>Discover</NavButton>
            <NavButton>Pricing</NavButton>
            <NavButton>FAQs</NavButton>
          </div>

          {/* Right: Auth Links & Split Sign Up Button */}
          <div className="flex items-center gap-6 md:gap-8">
            <Link href="/login" className="hidden md:block">
              <button className="bg-transparent border-none cursor-pointer font-sans text-[13px] font-semibold uppercase text-[#292929] tracking-[0.04em] transition-opacity hover:opacity-55 whitespace-nowrap">
                Login
              </button>
            </Link>
            <Link href="/login" className="inline-flex items-center">
              <div className="inline-flex -space-x-px rounded-lg border border-black/80 bg-wandor-dark text-[#fafafa] overflow-hidden shadow-sm shadow-black/10 rtl:space-x-reverse">
                <Button
                  className="rounded-none shadow-none bg-wandor-dark hover:bg-[#222] text-[#fafafa] font-sans text-[10px] font-semibold uppercase tracking-[0.06em] px-6 h-8 border-r border-white/20 border-t-0 border-b-0 border-l-0 cursor-pointer"
                >
                  Sign Up
                </Button>
                <Button
                  className="rounded-none shadow-none bg-wandor-dark hover:bg-[#222] text-[#fafafa] h-8 w-8 p-0 flex items-center justify-center border-none cursor-pointer"
                  size="icon"
                  aria-label="Open link"
                >
                  <SquareArrowOutUpRight size={12} strokeWidth={2} aria-hidden="true" />
                </Button>
              </div>
            </Link>
          </div>
        </nav>

        {/* Hero Body - Loreloom Copy & Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center w-full mx-auto">
          <h1 className="font-sans text-[clamp(40px,6vw,68px)] font-medium text-wandor-text leading-[1.05] tracking-[-0.04em] max-w-[840px] mb-5 mx-auto">
            Weave your next visual saga.
          </h1>
          <p className="font-sans text-xl font-medium text-wandor-muted leading-relaxed max-w-[540px] mb-10 mx-auto">
            Tell our AI art director your story premise. We'll generate persistent characters, visual chapters, and on-chain lore for you.
          </p>

          {/* Liquid Glass Prompt Card - Loreloom Lore Prompt */}
          <div className="relative w-[701px] max-md:w-[calc(100vw-48px)] min-h-[208px] bg-white/[0.06] border-[3px] border-white rounded-[44px] shadow-[0_0_4px_0_rgba(0,0,0,0.15)] overflow-hidden backdrop-blur-[20px] text-left mx-auto">
            <p className="absolute left-[29px] top-[57px] -translate-y-1/2 w-[609px] max-md:w-[calc(100%-58px)] font-sans text-xl max-md:text-[17px] font-medium text-wandor-prompt leading-relaxed break-words">
              I want to create a 5-chapter cyberpunk saga about Jax, a rogue android hunting lost memory files in the rain-slicked spires of Neo-Veridia....
            </p>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  alert(`Selected inspiration file: ${e.target.files[0].name}`);
                }
              }}
            />

            {/* Upload Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              aria-label="Upload inspiration"
              className="absolute left-[21px] top-[137px] w-11 h-11 bg-transparent border border-white/70 rounded-full cursor-pointer flex items-center justify-center backdrop-blur-[14px] transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
            >
              <Upload className="w-[18px] h-[18px] text-wandor-text flex-shrink-0" />
            </button>

            {/* Start Creating Button inside card */}
            <Link href="/genesis" className="absolute bottom-[21px] right-[21px] inline-flex items-center">
              <span className="w-[160px] h-14 bg-black border-none rounded-[44px] shadow-[0_0_2px_0_rgba(0,0,0,0.05)] cursor-pointer flex items-center justify-center font-sans text-base font-medium text-[#fafafa] uppercase tracking-[0.02em] transition-all hover:bg-[#333] active:scale-95 leading-none">
                Start Creating
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
