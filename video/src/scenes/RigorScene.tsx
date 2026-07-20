/** Act 6 · Production rigor (450f / 15s) — the unglamorous 60% that makes it real. */
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { SceneWrap, Reveal } from "../lib/kit";
import { AT } from "../lib/atlas";
import { sans, mono } from "../lib/ui";

const DUR = 450;

const ITEMS = [
  { icon: "🛡", title: "PHI isolation", body: "Coded data only. A 6-assertion test fails the build if a name could reach the model." },
  { icon: "✓", title: "Write-boundary validation", body: "Malformed FHIR is rejected before it ever reaches the server." },
  { icon: "⛓", title: "Tamper-evident audit", body: "SHA-256 hash-chained log. Editing history breaks the chain, and a test proves it." },
  { icon: "↻", title: "Resilience", body: "Timeouts, transient-only retries, and a circuit breaker on every model call." },
  { icon: "🔗", title: "Evidence provenance", body: "Every claim cites the exact FHIR resource behind it. Click a chip, the chart lights up." },
  { icon: "◷", title: "Cost telemetry", body: "Per-turn token count and dollar estimate, streamed live to the console." },
];

export const RigorScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <SceneWrap duration={DUR} vignetteStrength={0.3}>
      <AbsoluteFill style={{
        background: `linear-gradient(160deg, #f8f9f9 0%, #eef2f3 100%)`,
        padding: "60px 80px", fontFamily: sans,
      }}>
        <Reveal start={6}>
          <div style={{ textAlign: "center", marginBottom: 42 }}>
            <div style={{ fontSize: 15.5, fontWeight: 800, letterSpacing: "0.17em", textTransform: "uppercase", color: AT.teal, marginBottom: 12 }}>
              production, not a toy demo
            </div>
            <div style={{ fontSize: 52, fontWeight: 700, color: AT.ink, letterSpacing: "-0.025em" }}>
              The unglamorous 60% judges actually score
            </div>
          </div>
        </Reveal>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, maxWidth: 1500, margin: "0 auto" }}>
          {ITEMS.map((it, i) => {
            const at = 40 + i * 22;
            const local = frame - at;
            const o = interpolate(local, [0, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const x = interpolate(local, [0, 16], [i % 2 ? 22 : -22, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <div key={it.title} style={{
                opacity: o, transform: `translateX(${x}px)`,
                display: "flex", gap: 18, background: "#fff", border: `1px solid ${AT.line}`,
                borderRadius: 14, padding: "20px 24px", boxShadow: "0 6px 22px rgba(26,32,35,0.05)",
              }}>
                <div style={{
                  width: 46, height: 46, flexShrink: 0, borderRadius: 11, background: AT.tealSoft,
                  display: "grid", placeItems: "center", fontSize: 22,
                }}>{it.icon}</div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: AT.ink }}>{it.title}</div>
                  <div style={{ fontSize: 17, color: AT.muted, marginTop: 4, lineHeight: 1.4 }}>{it.body}</div>
                </div>
              </div>
            );
          })}
        </div>

        {frame > 340 && (
          <div style={{
            marginTop: 34, textAlign: "center",
            opacity: interpolate(frame, [340, 360], [0, 1], { extrapolateRight: "clamp" }),
            fontFamily: mono, fontSize: 18, color: AT.teal,
          }}>
            30 tests · CI green on every push · deployed on Vercel
          </div>
        )}
      </AbsoluteFill>
    </SceneWrap>
  );
};

export default RigorScene;
