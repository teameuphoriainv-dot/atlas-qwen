/** Act 1 · Title (270f / 9s) — Atlas wordmark, positioning, Qwen credit. */
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { SceneWrap, Reveal, Particles } from "../lib/kit";
import { AT } from "../lib/atlas";
import { sans, mono } from "../lib/ui";
import { AtlasMark } from "../lib/logo";

const DUR = 270;

export const TitleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const glow = interpolate(frame, [0, 90], [0, 1], { extrapolateRight: "clamp" });
  return (
    <SceneWrap duration={DUR} vignetteStrength={0.4}>
      <AbsoluteFill style={{
        background: `radial-gradient(ellipse 90% 70% at 50% 42%, #2f5058 0%, ${AT.tealDeep} 45%, #141f23 100%)`,
        alignItems: "center", justifyContent: "center",
      }}>
        <Particles count={40} tint={AT.tealSoft} opacity={0.35} />

        <div style={{ textAlign: "center", fontFamily: sans, zIndex: 2 }}>
          <Reveal start={8}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 24, marginBottom: 28 }}>
              <AtlasMark size={82} stroke="#ffffff" glow={glow} />
              <div style={{ fontSize: 96, fontWeight: 600, color: "#fff", letterSpacing: "-0.04em", fontFamily: sans }}>Atlas</div>
            </div>
          </Reveal>

          <Reveal start={30}>
            <div style={{ fontSize: 34, color: "rgba(255,255,255,0.9)", fontWeight: 500, letterSpacing: "-0.015em" }}>
              An autopilot agent for the electronic health record
            </div>
          </Reveal>

          <Reveal start={52}>
            <div style={{ fontSize: 25, color: AT.tealSoft, marginTop: 20, lineHeight: 1.45 }}>
              One model acts. Another model objects. The clinician holds the pen.
            </div>
          </Reveal>

          <Reveal start={92}>
            <div style={{
              marginTop: 46, display: "inline-flex", alignItems: "center", gap: 12,
              border: "1px solid rgba(255,255,255,0.22)", borderRadius: 100, padding: "11px 24px",
              background: "rgba(255,255,255,0.07)", fontFamily: mono, fontSize: 17, color: "rgba(255,255,255,0.92)",
            }}>
              <span style={{ width: 8, height: 8, borderRadius: 8, background: "#4ade80" }} />
              Powered by Qwen on Alibaba Cloud Model Studio
            </div>
          </Reveal>

          <Reveal start={118}>
            <div style={{ marginTop: 22, fontSize: 17, color: "rgba(255,255,255,0.45)", fontFamily: mono, letterSpacing: "0.05em" }}>
              GLOBAL AI HACKATHON · TRACK 4 · AUTOPILOT AGENT
            </div>
          </Reveal>
        </div>
      </AbsoluteFill>
    </SceneWrap>
  );
};

export default TitleScene;
