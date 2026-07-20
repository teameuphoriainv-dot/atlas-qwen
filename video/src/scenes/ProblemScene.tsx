/** Act 2 · The problem (450f / 15s) — order entry is where clinicians lose the day. */
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { SceneWrap, Reveal } from "../lib/kit";
import { AT } from "../lib/atlas";
import { sans, Headline } from "../lib/ui";

const DUR = 450;

const CLICKS = [
  "Orders", "New Order", "Search…", "Laboratory", "Hematology",
  "CBC w/ Diff", "Priority?", "Routine", "Frequency?", "Once",
  "Indication?", "Diagnosis…", "Sign", "Confirm",
];

export const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <SceneWrap duration={DUR} vignetteStrength={0.38}>
      <AbsoluteFill style={{
        background: `linear-gradient(160deg, #16232a 0%, #101a1e 100%)`,
        alignItems: "center", justifyContent: "center", padding: 90,
      }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 46, zIndex: 2 }}>
          <Reveal start={6}>
            <Headline
              eyebrow="the workflow"
              title={<>One sentence of intent.<br />Fourteen clicks of software.</>}
            />
          </Reveal>

          {/* The click cascade */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 11, justifyContent: "center", maxWidth: 1180 }}>
            {CLICKS.map((c, i) => {
              const at = 70 + i * 13;
              const local = frame - at;
              if (local < 0) return null;
              const o = interpolate(local, [0, 7], [0, 1], { extrapolateRight: "clamp" });
              const s = interpolate(local, [0, 9], [0.9, 1], { extrapolateRight: "clamp" });
              const fade = interpolate(frame, [300, 360], [1, 0.28], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              return (
                <div key={i} style={{
                  opacity: o * fade, transform: `scale(${s})`,
                  border: "1px solid rgba(255,255,255,0.16)", background: "rgba(255,255,255,0.05)",
                  color: "rgba(255,255,255,0.8)", borderRadius: 8, padding: "10px 18px",
                  fontSize: 20, fontFamily: sans,
                }}>{c}</div>
              );
            })}
          </div>

          <Reveal start={310}>
            <div style={{
              fontFamily: sans, fontSize: 30, color: "#fff", textAlign: "center", lineHeight: 1.45,
              maxWidth: 1000,
            }}>
              Clinicians spend more of the day driving the EHR
              <br />
              <span style={{ color: AT.tealSoft }}>than talking to patients.</span>
            </div>
          </Reveal>

          <Reveal start={370}>
            <div style={{ fontFamily: sans, fontSize: 25, color: "rgba(255,255,255,0.62)", textAlign: "center" }}>
              So we built an agent that does the driving. Safely.
            </div>
          </Reveal>
        </div>
      </AbsoluteFill>
    </SceneWrap>
  );
};

export default ProblemScene;
