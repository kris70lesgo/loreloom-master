"use client";

import React from "react";

function parseInlineFormatting(text: string): React.ReactNode[] {
  // Replace em-dashes (—) with a clean comma/space
  const sanitized = text.replace(/—/g, ", ");
  
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*.*?\*\*|\*.*?\*|_.*?_)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(sanitized)) !== null) {
    if (match.index > lastIndex) {
      parts.push(sanitized.substring(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={match.index} className="font-semibold text-white">
          {token.slice(2, -2)}
        </strong>
      );
    } else if ((token.startsWith("*") && token.endsWith("*")) || (token.startsWith("_") && token.endsWith("_"))) {
      parts.push(
        <em key={match.index} className="italic text-purple-300 font-serif opacity-95 px-0.5">
          {token.slice(1, -1)}
        </em>
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < sanitized.length) {
    parts.push(sanitized.substring(lastIndex));
  }

  return parts;
}

export function SimpleMarkdown({ text }: { text: string }) {
  if (!text) return null;

  const cleanText = text.replace(/\\n/g, "\n");
  const lines = cleanText.split("\n");

  return (
    <div
      data-testid="simple-markdown"
      className="font-sans leading-relaxed text-gray-200 text-sm md:text-base space-y-3"
    >
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return null;

        if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
          const content = trimmed.slice(2, -2);
          return (
            <h4 key={i} className="font-bold text-white text-base mt-3 mb-1">
              {content}
            </h4>
          );
        }

        if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
          return (
            <li key={i} className="ml-4 list-disc text-gray-300 leading-relaxed">
              {parseInlineFormatting(trimmed.slice(2))}
            </li>
          );
        }

        if (trimmed === "---") {
          return <hr key={i} className="border-t border-white/10 my-4" />;
        }

        return (
          <p key={i} className="leading-relaxed text-gray-200 text-[14.5px] md:text-[15.5px]">
            {parseInlineFormatting(trimmed)}
          </p>
        );
      })}
    </div>
  );
}
