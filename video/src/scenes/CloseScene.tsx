/** Act 7 · Close (300f / 10s) — the thesis + the links. */
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { SceneWrap, Reveal, Particles } from "../lib/kit";
import { AT } from "../lib/atlas";
import { sans, mono } from "../lib/ui";
import { AtlasMark } from "../lib/logo";

const DUR = 300;

export const CloseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const glow = interpolate(frame, [0, 70], [0, 1], { extrapolateRight: "clamp" });
  return (
    <SceneWrap duration={DUR} vignetteStrength={0.42}>
      <AbsoluteFill style={{
        background: `radial-gradient(ellipse 90% 70% at 50% 44%, #2f5058 0%, ${AT.tealDeep} 45%, #121c20 100%)`,
        alignItems: "center", justifyContent: "center", fontFamily: sans,
      }}>
        <Particles count={34} tint={AT.tealSoft} opacity={0.3} />

        <div style={{ textAlign: "center", zIndex: 2, maxWidth: 1300, padding: 40 }}>
          <Reveal start={6}>
            <div style={{ fontSize: 44, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1.28 }}>
              Autonomy in medicine isn't one brilliant model.
            </div>
          </Reveal>
          <Reveal start={34}>
            <div style={{ fontSize: 30, color: AT.tealSoft, marginTop: 20, lineHeight: 1.45 }}>
              It's a system: a model that acts, a model that objects,
              <br />deterministic rails around both, and a human holding the pen.
            </div>
          </Reveal>

          <Reveal start={78}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, marginTop: 48 }}>
              <AtlasMark size={62} stroke="#ffffff" glow={glow} />
              <div style={{ fontSize: 62, fontWeight: 600, color: "#fff", letterSpacing: "-0.035em", fontFamily: sans }}>Atlas</div>
            </div>
          </Reveal>

          <Reveal start={110}>
            <div style={{
              marginTop: 30, display: "inline-flex", alignItems: "center", gap: 12,
              border: "1px solid rgba(255,255,255,0.22)", borderRadius: 100, padding: "10px 22px",
              background: "rgba(255,255,255,0.07)", fontFamily: mono, fontSize: 16, color: "rgba(255,255,255,0.9)",
            }}>
              <span style={{ width: 8, height: 8, borderRadius: 8, background: AT.alibaba }} />
              Built on Qwen · Alibaba Cloud Model Studio
            </div>
          </Reveal>

          <Reveal start={140}>
            <div style={{ marginTop: 28, fontFamily: mono, fontSize: 18, color: "rgba(255,255,255,0.82)", lineHeight: 1.8 }}>
              <div>atlas-qwen.vercel.app</div>
              <div style={{ color: "rgba(255,255,255,0.5)" }}>github.com/teameuphoriainv-dot/atlas-qwen</div>
            </div>
          </Reveal>
        </div>
      </AbsoluteFill>
    </SceneWrap>
  );
};

export default CloseScene;
