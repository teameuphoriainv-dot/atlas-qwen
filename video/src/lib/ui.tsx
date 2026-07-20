/**
 * Atlas-specific UI primitives for the demo film: the EHR chrome, the floating
 * copilot panel, proposal cards with Safety Sentinel badges, and the Live
 * System Console. These mirror the real product components so the film shows
 * the actual interface language, not generic mockups.
 */
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { AT } from "./atlas";
import { FONTS } from "./theme";
import { AtlasMark } from "./logo";

export const sans = FONTS.dmsans;
export const mono = FONTS.mono;

/** Typewriter text: reveals `text` over `dur` frames starting at `start`. */
export const Typed: React.FC<{ text: string; start: number; dur?: number; caret?: boolean }> = ({
  text, start, dur = 40, caret = true,
}) => {
  const frame = useCurrentFrame();
  const local = frame - start;
  const n = Math.max(0, Math.min(text.length, Math.round(interpolate(local, [0, dur], [0, text.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }))));
  const done = n >= text.length;
  const blink = Math.floor(frame / 15) % 2 === 0;
  return (
    <span>
      {text.slice(0, n)}
      {caret && !done && <span style={{ opacity: blink ? 1 : 0.25 }}>▌</span>}
    </span>
  );
};

/** The Meridian Health EHR top chrome (matches EhrBackdrop). */
export const EhrChrome: React.FC = () => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#1e293b", color: "#e2e8f0", padding: "12px 22px", fontFamily: sans }}>
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 26, height: 26, borderRadius: 6, background: "#3b82f6", color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 15 }}>M</div>
      <span style={{ fontWeight: 700, fontSize: 19 }}>Meridian Health</span>
      <span style={{ fontSize: 14, color: "#94a3b8" }}>EpicCare · Inpatient</span>
      <span style={{ background: "#fbbf24", color: "#0f172a", fontSize: 11, fontWeight: 800, padding: "3px 8px", borderRadius: 5, letterSpacing: "0.04em" }}>DEMO · SYNTHETIC DATA</span>
    </div>
    <div style={{ display: "flex", gap: 26, fontSize: 15, color: "#cbd5e1" }}>
      <span style={{ color: "#fff" }}>Chart Review</span><span>Orders</span><span>Notes</span><span>Results</span>
    </div>
  </div>
);

/** A chart card (Problem List / Medications / Allergies). */
export const ChartCard: React.FC<{
  title: string; items: { label: string; code?: string }[]; highlight?: boolean; width?: number;
}> = ({ title, items, highlight, width }) => (
  <div style={{
    width, background: AT.surface, border: `1px solid ${highlight ? AT.tealSoft : "#e2e8f0"}`, borderRadius: 8,
    boxShadow: highlight ? `0 0 0 3px ${AT.tealSoft}` : "0 1px 2px rgba(0,0,0,0.04)", overflow: "hidden",
    transition: "box-shadow 200ms",
  }}>
    <div style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", padding: "8px 14px", fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#64748b", fontFamily: sans }}>
      {title}
    </div>
    <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
          <span style={{ fontSize: 16, color: "#334155", fontFamily: sans }}>{it.label}</span>
          {it.code && <span style={{ fontSize: 12, color: "#94a3b8", fontFamily: mono }}>{it.code}</span>}
        </div>
      ))}
    </div>
  </div>
);

export type ConsoleRow = { tag: string; color: string; text: string; detail?: string; ms?: string };

/** The Live System Console (dark overlay, streaming rows). */
export const LiveConsole: React.FC<{
  rows: ConsoleRow[]; start: number; stagger?: number; width?: number; title?: string;
}> = ({ rows, start, stagger = 16, width = 620, title = "Live System Console" }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{
      width, background: AT.consoleBg, borderRadius: 10, overflow: "hidden",
      border: "1px solid rgba(255,255,255,0.09)", boxShadow: "0 24px 60px rgba(0,0,0,0.45)", fontFamily: mono,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <span style={{ width: 8, height: 8, borderRadius: 8, background: "#4ade80" }} />
        <span style={{ fontSize: 13, color: AT.consoleInk, letterSpacing: "0.04em" }}>{title}</span>
      </div>
      <div style={{ padding: "8px 0" }}>
        {rows.map((r, i) => {
          const at = start + i * stagger;
          const local = frame - at;
          if (local < 0) return null;
          const o = interpolate(local, [0, 8], [0, 1], { extrapolateRight: "clamp" });
          const y = interpolate(local, [0, 10], [6, 0], { extrapolateRight: "clamp" });
          return (
            <div key={i} style={{ opacity: o, transform: `translateY(${y}px)`, display: "flex", alignItems: "baseline", gap: 10, padding: "3px 14px", fontSize: 14.5 }}>
              <span style={{ color: r.color, fontWeight: 700, width: 82, flexShrink: 0 }}>{r.tag}</span>
              <span style={{ color: AT.consoleInk, flex: 1, minWidth: 0 }}>
                {r.text}
                {r.detail && <span style={{ color: AT.consoleDim }}> · {r.detail}</span>}
              </span>
              {r.ms && <span style={{ color: AT.consoleDim, flexShrink: 0 }}>{r.ms}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** A proposed-action card with an optional Safety Sentinel verdict badge. */
export const ProposalCard: React.FC<{
  resourceType: string; summary: string; code?: string;
  verdict?: "pass" | "warn" | "block"; reason?: string; appear: number; width?: number;
}> = ({ resourceType, summary, code, verdict, reason, appear, width = 520 }) => {
  const frame = useCurrentFrame();
  const local = frame - appear;
  if (local < 0) return null;
  const o = interpolate(local, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const y = interpolate(local, [0, 14], [14, 0], { extrapolateRight: "clamp" });
  const badge = verdict === "block"
    ? { text: "Sentinel ✕ flagged", bg: "rgba(186,26,26,0.1)", fg: AT.error }
    : verdict === "warn"
      ? { text: "Sentinel ⚠ review", bg: "rgba(176,84,54,0.14)", fg: AT.warning }
      : verdict === "pass"
        ? { text: "Sentinel ✓", bg: "rgba(85,125,110,0.12)", fg: AT.success }
        : null;
  return (
    <div style={{
      width, opacity: o, transform: `translateY(${y}px)`,
      background: AT.surface, border: `1px solid ${verdict === "block" ? "rgba(186,26,26,0.35)" : AT.line}`,
      borderRadius: 8, padding: "12px 14px", fontFamily: sans,
      boxShadow: "0 6px 20px rgba(26,32,35,0.07)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: "0.07em", color: AT.info, textTransform: "uppercase" }}>{resourceType}</span>
        {badge && (
          <span style={{ fontSize: 12, fontWeight: 700, color: badge.fg, background: badge.bg, padding: "3px 9px", borderRadius: 5 }}>{badge.text}</span>
        )}
      </div>
      <div style={{ fontSize: 17.5, color: AT.ink, marginTop: 3 }}>{summary}</div>
      {code && <div style={{ fontSize: 12.5, color: AT.muted, fontFamily: mono, marginTop: 3 }}>{code}</div>}
      {reason && (
        <div style={{ fontSize: 13.5, color: AT.warning, marginTop: 7, lineHeight: 1.35 }}>⚠ {reason}</div>
      )}
    </div>
  );
};

/** Floating Atlas copilot panel (teal header + body). */
export const AtlasPanel: React.FC<{ children: React.ReactNode; width?: number; subtitle?: string }> = ({
  children, width = 580, subtitle = "agentic copilot",
}) => (
  <div style={{
    width, background: AT.surface, borderRadius: 14, overflow: "hidden",
    boxShadow: "0 30px 80px rgba(15,30,35,0.32)", border: `1px solid ${AT.line}`,
  }}>
    <div style={{ background: AT.teal, color: "#fff", padding: "12px 18px", display: "flex", alignItems: "center", gap: 11, fontFamily: sans }}>
      <AtlasMark size={26} stroke="#ffffff" />
      <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: "-0.02em" }}>Atlas</span>
      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>{subtitle}</span>
    </div>
    <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>{children}</div>
  </div>
);

/** User chat bubble. */
export const UserBubble: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    alignSelf: "flex-end", background: AT.teal, color: "#fff", padding: "10px 16px",
    borderRadius: "12px 12px 4px 12px", fontSize: 17, fontFamily: sans, maxWidth: "88%",
  }}>{children}</div>
);

/** Atlas reply bubble. */
export const AtlasBubble: React.FC<{ children: React.ReactNode; appear?: number }> = ({ children, appear = 0 }) => {
  const frame = useCurrentFrame();
  const local = frame - appear;
  if (local < 0) return null;
  const o = interpolate(local, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div style={{
      opacity: o, alignSelf: "flex-start", background: AT.surfaceAlt, color: AT.ink, padding: "10px 16px",
      borderRadius: "12px 12px 12px 4px", fontSize: 17, fontFamily: sans, maxWidth: "92%", lineHeight: 1.4,
    }}>{children}</div>
  );
};

/** Evidence citation chip. */
export const EvidenceChip: React.FC<{ label: string }> = ({ label }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 5, border: `1px solid ${AT.line}`,
    background: AT.surface, color: AT.info, borderRadius: 5, padding: "2px 7px",
    fontSize: 12, fontFamily: mono,
  }}>🔗 {label}</span>
);

/** Section eyebrow + headline used by the explainer scenes. */
export const Headline: React.FC<{ eyebrow?: string; title: React.ReactNode; sub?: React.ReactNode; align?: "center" | "left" }> = ({
  eyebrow, title, sub, align = "center",
}) => (
  <div style={{ textAlign: align, fontFamily: sans, maxWidth: 1400 }}>
    {eyebrow && (
      <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: AT.tealSoft, marginBottom: 14 }}>{eyebrow}</div>
    )}
    <div style={{ fontSize: 62, fontWeight: 700, letterSpacing: "-0.025em", color: "#fff", lineHeight: 1.08 }}>{title}</div>
    {sub && <div style={{ fontSize: 26, color: "rgba(255,255,255,0.66)", marginTop: 18, lineHeight: 1.4 }}>{sub}</div>}
  </div>
);
