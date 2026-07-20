/** Devpost gallery cover — bold, readable as a small thumbnail. Static (1 frame). */
import React from "react";
import { AbsoluteFill } from "remotion";
import { AT, MODELS } from "../lib/atlas";
import { sans, mono } from "../lib/ui";
import { AtlasMark } from "../lib/logo";
import { FONTS } from "../lib/theme";

export const CoverScene: React.FC = () => {
  return (
    <AbsoluteFill style={{
      background: `radial-gradient(ellipse 95% 75% at 50% 40%, #2f5058 0%, ${AT.tealDeep} 46%, #101a1e 100%)`,
      alignItems: "center", justifyContent: "center", fontFamily: sans,
    }}>
      {/* subtle grid */}
      <AbsoluteFill style={{
        backgroundImage: "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
        backgroundSize: "60px 60px", maskImage: "radial-gradient(ellipse 70% 60% at 50% 45%, black 30%, transparent 75%)",
      }} />
      {/* vignette */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 80% at 50% 47%, transparent 52%, rgba(6,20,18,0.45) 100%)" }} />

      <div style={{ textAlign: "center", zIndex: 2, padding: 40 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 26, marginBottom: 26 }}>
          <AtlasMark size={104} stroke="#ffffff" glow={0.85} />
          <div style={{ fontSize: 118, fontWeight: 600, color: "#fff", letterSpacing: "-0.04em" }}>Atlas</div>
        </div>

        <div style={{ fontSize: 40, fontWeight: 500, color: "#fff", letterSpacing: "-0.015em" }}>
          An autopilot agent for the electronic health record
        </div>
        <div style={{ fontSize: 27, color: AT.tealSoft, marginTop: 16 }}>
          One model acts. Another model objects. The clinician holds the pen.
        </div>

        {/* Qwen model chips */}
        <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 44 }}>
          {MODELS.map((m) => (
            <div key={m.name} style={{
              border: `1px solid ${m.color}55`, background: `${m.color}14`, borderRadius: 10,
              padding: "10px 18px", fontFamily: mono, fontSize: 19, fontWeight: 700, color: m.color,
            }}>{m.name}</div>
          ))}
        </div>

        <div style={{
          marginTop: 34, display: "inline-flex", alignItems: "center", gap: 12,
          border: "1px solid rgba(255,255,255,0.22)", borderRadius: 100, padding: "11px 24px",
          background: "rgba(255,255,255,0.07)", fontFamily: mono, fontSize: 18, color: "rgba(255,255,255,0.92)",
        }}>
          <span style={{ width: 9, height: 9, borderRadius: 9, background: AT.alibaba }} />
          Built on Qwen · Alibaba Cloud Model Studio · Track 4
        </div>
      </div>
    </AbsoluteFill>
  );
};

export default CoverScene;
