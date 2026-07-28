"use client";

import React, { useEffect, useRef } from "react";
import { useScroll, useMotionValueEvent } from "framer-motion";

interface ScrollSequenceProps {
  numFrames: number;
}

export function ScrollSequence({ numFrames }: ScrollSequenceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { scrollYProgress } = useScroll();
  const imagesRef = useRef<HTMLImageElement[]>([]);

  const drawFrame = (frameIndex: number, imagesArray: HTMLImageElement[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = imagesArray[frameIndex - 1];
    if (!img || !img.complete || img.naturalWidth === 0) return;

    // Support high-DPI (Retina) displays to prevent pixelation
    const dpr = window.devicePixelRatio || 1;
    
    // Set actual canvas size to physical screen pixels
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;

    // Scale the context so our drawing coordinates use CSS pixels
    ctx.scale(dpr, dpr);

    const cssWidth = window.innerWidth;
    const cssHeight = window.innerHeight;

    // Calculate scaling to 'cover' the screen
    const scale = Math.max(
      cssWidth / img.width,
      cssHeight / img.height
    );
    
    const x = (cssWidth / 2) - (img.width / 2) * scale;
    const y = (cssHeight / 2) - (img.height / 2) * scale;
    
    ctx.clearRect(0, 0, cssWidth, cssHeight);
    
    // Fill with base background to prevent flickering transparent edges
    ctx.fillStyle = "#050505";
    ctx.fillRect(0, 0, cssWidth, cssHeight);
    
    // Enable image smoothing for best quality
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
  };

  useEffect(() => {
    const images: HTMLImageElement[] = [];

    // Preload all frames
    for (let i = 1; i <= numFrames; i++) {
      const img = new Image();
      // Format as frame_0001.webp
      const paddedIndex = i.toString().padStart(4, "0");
      img.src = `/sequence/frame_${paddedIndex}.webp`;
      
      img.onload = () => {
        // If this is the first frame, draw it immediately
        if (i === 1) {
          drawFrame(1, images);
        }
      };
      
      images.push(img);
    }
    
    imagesRef.current = images;

    // Handle window resize
    const handleResize = () => {
      drawFrame(1, imagesRef.current);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [numFrames]);

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (imagesRef.current.length === 0) return;
    
    // Map scroll progress 0-1 to frame index 1-numFrames
    let frameIndex = Math.floor(latest * numFrames) + 1;
    if (frameIndex > numFrames) frameIndex = numFrames;
    if (frameIndex < 1) frameIndex = 1;
    
    // We draw immediately bypassing react renders
    drawFrame(frameIndex, imagesRef.current);
  });

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100vh", zIndex: 0, background: "#050505" }}>
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
        }}
      />
      {/* Edge blending shadow to ensure seamless transition into the void */}
      <div style={{
        position: "absolute",
        inset: 0,
        boxShadow: "inset 0 0 100px 50px #050505",
        pointerEvents: "none",
        zIndex: 1
      }} />
    </div>
  );
}
