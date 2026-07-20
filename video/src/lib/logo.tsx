/**
 * Atlas logomark — a clean geometric compass-star inside a rounded tile.
 * Atlas = the one who maps/holds the world; the mark reads as a compass rose,
 * a subtle "A" apex, and a caret (agentic action). Pure SVG, crisp at any size.
 */
import React from "react";

export const AtlasMark: React.FC<{
  size?: number;
  stroke?: string;
  fill?: string;
  bg?: string;
  glow?: number; // 0..1
}> = ({ size = 64, stroke = "#ffffff", fill = "none", bg = "transparent", glow = 0 }) => {
  const r = size * 0.22;
  const c = size / 2;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" style={{
      filter: glow > 0 ? `drop-shadow(0 0 ${14 * glow}px rgba(203,227,233,${0.55 * glow}))` : undefined,
    }}>
      {bg !== "transparent" && (
        <rect x="1.5" y="1.5" width="61" height="61" rx={r / (size / 64)} fill={bg} />
      )}
      <rect x="2" y="2" width="60" height="60" rx="15" fill={fill} stroke={stroke} strokeWidth="2.4" opacity={0.9} />
      {/* compass star: 4-point sharp diamond + apex accent */}
      <path
        d="M32 12 L37.5 29 L32 34 L26.5 29 Z"
        fill={stroke}
        opacity="0.95"
      />
      <path
        d="M32 52 L26.5 35 L32 30 L37.5 35 Z"
        fill={stroke}
        opacity="0.45"
      />
      <path d="M12 32 L29 37.5 L34 32 L29 26.5 Z" fill={stroke} opacity="0.55" />
      <path d="M52 32 L35 26.5 L30 32 L35 37.5 Z" fill={stroke} opacity="0.55" />
      <circle cx={c} cy={c} r="2.6" fill={stroke} />
    </svg>
  );
};

/** Full lockup: mark + "Atlas" wordmark. */
export const AtlasLockup: React.FC<{
  size?: number; color?: string; gap?: number; glow?: number; font?: string;
}> = ({ size = 64, color = "#ffffff", gap, glow = 0, font }) => (
  <div style={{ display: "flex", alignItems: "center", gap: gap ?? size * 0.34 }}>
    <AtlasMark size={size} stroke={color} glow={glow} />
    <div style={{
      fontFamily: font, fontWeight: 600, fontSize: size * 1.32, color,
      letterSpacing: "-0.035em", lineHeight: 1,
    }}>Atlas</div>
  </div>
);
