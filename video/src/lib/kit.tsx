/**
 * Shared cinematic kit for the Solace demo. Scenes compose these primitives so
 * motion + device chrome + brand stay consistent across the whole film.
 */
import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { A, C, EASE_IN_OUT, EASE_OUT, FONTS } from "./theme";

export const CROSSFADE = 24;

/** Scene wrapper: crossfade in/out + slow cinematic push-in + optional vignette. */
export const SceneWrap: React.FC<{
  children: React.ReactNode;
  duration: number;
  push?: boolean;
  vignette?: boolean;
  vignetteStrength?: number;
}> = ({ children, duration, push = true, vignette = true, vignetteStrength = 0.28 }) => {
  const frame = useCurrentFrame();
  const o = interpolate(
    frame,
    [0, CROSSFADE, duration - CROSSFADE, duration],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const scale = push
    ? interpolate(frame, [0, duration], [1.0, 1.045], { extrapolateRight: "clamp", easing: EASE_IN_OUT })
    : 1;
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <AbsoluteFill style={{ transform: `scale(${scale})`, transformOrigin: "center" }}>
        {children}
      </AbsoluteFill>
      {vignette && <Vignette strength={vignetteStrength} />}
    </AbsoluteFill>
  );
};

export const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.28 }) => (
  <AbsoluteFill style={{
    pointerEvents: "none",
    background: `radial-gradient(ellipse 80% 80% at 50% 47%, transparent 54%, rgba(6,30,24,${strength}) 100%)`,
  }} />
);

/** Deterministic drifting particle field (render-safe — no Math.random). */
export const Particles: React.FC<{ count?: number; tint?: string; opacity?: number }> = ({
  count = 38, tint = C.mint, opacity = 0.5,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const dots = Array.from({ length: count }, (_, i) => {
    const sx = Math.abs((Math.sin(i * 12.9898) * 43758.5453) % 1);
    const sy = Math.abs((Math.sin(i * 78.233) * 43758.5453) % 1);
    const speed = 1.4 + sx * 3.2;
    let y = (sy * 100 - t * speed) % 100;
    if (y < 0) y += 100;
    return { x: sx * 100, y, size: 1.5 + sy * 3.5, tw: 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * 2 + i)) };
  });
  return (
    <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden" }}>
      {dots.map((d, i) => (
        <div key={i} style={{
          position: "absolute", left: `${d.x}%`, top: `${d.y}%`,
          width: d.size, height: d.size, borderRadius: "50%",
          background: tint, opacity: opacity * d.tw, boxShadow: `0 0 ${d.size * 3}px ${tint}`,
        }} />
      ))}
    </AbsoluteFill>
  );
};

/** Soft drifting orbs for ambient depth. */
export const AmbientOrbs: React.FC<{ tint?: string; opacity?: number }> = ({ tint = C.mint, opacity = 0.18 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const orbs = [
    { size: 900, x: 18, y: 22, freq: 0.05, phase: 0 },
    { size: 700, x: 82, y: 60, freq: 0.04, phase: 2 },
    { size: 560, x: 45, y: 88, freq: 0.06, phase: 4 },
  ];
  return (
    <AbsoluteFill style={{ overflow: "hidden", pointerEvents: "none" }}>
      {orbs.map((o, i) => {
        const dx = Math.sin(t * o.freq * 2 * Math.PI + o.phase) * 36;
        const dy = Math.cos(t * o.freq * 2 * Math.PI + o.phase * 0.7) * 26;
        return (
          <div key={i} style={{
            position: "absolute", left: `${o.x}%`, top: `${o.y}%`,
            width: o.size, height: o.size, borderRadius: "50%",
            background: `radial-gradient(circle, ${tint} 0%, transparent 70%)`,
            transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`,
            opacity, filter: "blur(40px)",
          }} />
        );
      })}
    </AbsoluteFill>
  );
};

/** 3D tilt wrapper — entrance settles to a gentle resting angle, then floats. */
export const Tilt3D: React.FC<{ children: React.ReactNode; rest?: number }> = ({ children, rest = 3 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const ry = interpolate(frame, [0, 64], [-12, rest], { extrapolateRight: "clamp", easing: EASE_OUT });
  const rx = interpolate(frame, [0, 64], [7, 0], { extrapolateRight: "clamp", easing: EASE_OUT });
  const floatY = Math.sin(t * 0.6 * Math.PI) * 7;
  const floatR = Math.sin(t * 0.4 * Math.PI) * 1.1;
  return (
    <div style={{ perspective: 1800 }}>
      <div style={{ transform: `rotateY(${ry + floatR}deg) rotateX(${rx}deg) translateY(${floatY}px)`, transformStyle: "preserve-3d" }}>
        {children}
      </div>
    </div>
  );
};

/** Reveal helper: returns opacity + translateY for a staggered entrance. */
export const useReveal = (start: number, dur = 22, dist = 18) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [start, start + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const y = interpolate(frame, [start, start + dur], [dist, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_OUT });
  return { opacity, transform: `translateY(${y}px)` };
};

export const Reveal: React.FC<{ start: number; dur?: number; dist?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ start, dur, dist, children, style }) => {
  const r = useReveal(start, dur, dist);
  return <div style={{ ...r, ...style }}>{children}</div>;
};

/** Lower-third caption. variant 'consumer' = green ink chip, 'dark' = glass on dark. */
export const Caption: React.FC<{
  children: React.ReactNode; from: number; duration: number;
  position?: "top" | "bottom"; variant?: "consumer" | "dark";
}> = ({ children, from, duration, position = "bottom", variant = "consumer" }) => {
  const frame = useCurrentFrame();
  const local = frame - from;
  if (local < 0 || local > duration) return null;
  const opacity = interpolate(local, [0, 18, duration - 18, duration], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const dark = variant === "dark";
  return (
    <AbsoluteFill style={{
      alignItems: "center", justifyContent: position === "top" ? "flex-start" : "flex-end",
      paddingTop: position === "top" ? 54 : 0, paddingBottom: position === "bottom" ? 60 : 0, pointerEvents: "none",
    }}>
      <div style={{
        opacity,
        background: dark ? "rgba(10,20,16,0.82)" : "rgba(255,255,255,0.92)",
        color: dark ? "#fff" : C.ink,
        padding: "16px 30px", borderRadius: 100, fontSize: 27, fontFamily: FONTS.sofia,
        fontWeight: 600, letterSpacing: "-0.01em", maxWidth: 1500, textAlign: "center",
        backdropFilter: "blur(8px)",
        boxShadow: dark ? "0 12px 40px rgba(0,0,0,0.3)" : "0 12px 40px rgba(11,107,83,0.16)",
        border: dark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(11,107,83,0.08)",
      }}>{children}</div>
    </AbsoluteFill>
  );
};

/** The Solace "S" rounded-square glyph + lowercase wordmark. */
export const Logo: React.FC<{ size?: number; color?: string; wordmark?: boolean }> = ({ size = 34, color = C.green, wordmark = true }) => (
  <div style={{ display: "flex", alignItems: "center", gap: size * 0.32 }}>
    <div style={{
      width: size, height: size, borderRadius: size * 0.28,
      border: `${Math.max(2, size * 0.07)}px solid ${color}`, color,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: FONTS.sofia, fontWeight: 700, fontSize: size * 0.62,
    }}>S</div>
    {wordmark && (
      <span style={{ fontFamily: FONTS.sofia, fontWeight: 600, fontSize: size * 0.82, color, letterSpacing: "-0.02em" }}>
        solace
      </span>
    )}
  </div>
);

/** Floating pill navigation bar (consumer brand). */
export const NavPill: React.FC<{ width?: number }> = ({ width = 820 }) => (
  <div style={{
    width, height: 64, borderRadius: 100, background: "rgba(255,255,255,0.86)",
    border: "1px solid rgba(11,107,83,0.08)", boxShadow: "0 8px 30px rgba(0,0,0,0.06)",
    backdropFilter: "blur(10px)", display: "flex", alignItems: "center",
    padding: "0 14px 0 22px", gap: 26, fontFamily: FONTS.sofia,
  }}>
    <Logo size={28} />
    <div style={{ flex: 1 }} />
    {["Our Products", "How it Works", "For Clinicians", "Integrations", "Pricing"].map((l) => (
      <span key={l} style={{ fontSize: 15, color: C.ink, fontWeight: 500, opacity: 0.82 }}>{l}</span>
    ))}
    <div style={{
      height: 40, padding: "0 20px", borderRadius: 100, background: C.green, color: "#fff",
      display: "flex", alignItems: "center", fontSize: 15, fontWeight: 600,
    }}>Book a Demo</div>
  </div>
);

/** Consumer-brand phone bezel. */
export const PhoneFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    position: "relative", width: 420, height: 860, borderRadius: 58, background: "#0b0d0c", padding: 14,
    boxShadow: "0 40px 120px rgba(0,0,0,0.45), 0 0 0 2px rgba(255,255,255,0.06) inset",
  }}>
    <div style={{
      position: "absolute", top: 22, left: "50%", transform: "translateX(-50%)",
      width: 110, height: 32, borderRadius: 16, background: "#000", zIndex: 5,
    }} />
    <div style={{
      width: "100%", height: "100%", borderRadius: 46, overflow: "hidden",
      background: "#fff", fontFamily: FONTS.sofia, color: C.ink, position: "relative",
    }}>{children}</div>
  </div>
);

/** Laptop bezel for the Atlas terminal. Uses container queries (cqw) inside. */
export const LaptopFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ position: "relative", width: 1560, height: 920 }}>
    <div style={{ position: "absolute", inset: 0, borderRadius: 18, background: "#16201f", padding: 12, boxShadow: "0 30px 90px rgba(0,0,0,0.35)" }}>
      <div style={{
        width: "100%", height: "100%", borderRadius: 10, overflow: "hidden",
        background: A.page, containerType: "inline-size",
      }}>{children}</div>
    </div>
  </div>
);
