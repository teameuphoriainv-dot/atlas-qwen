/** Act 5 · Architecture (630f / 21s) — four Qwen models, routed, all on Alibaba Cloud. */
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { SceneWrap, Reveal } from "../lib/kit";
import { AT, MODELS } from "../lib/atlas";
import { sans, mono } from "../lib/ui";

const DUR = 630;

const Node: React.FC<{ label: string; sub?: string; color?: string; w?: number }> = ({ label, sub, color = "rgba(255,255,255,0.9)", w = 250 }) => (
  <div style={{
    width: w, borderRadius: 12, border: `1px solid ${color}44`, background: `${color}12`,
    padding: "16px 18px", fontFamily: sans, textAlign: "center",
  }}>
    <div style={{ fontSize: 21, fontWeight: 700, color }}>{label}</div>
    {sub && <div style={{ fontSize: 15, color: "rgba(255,255,255,0.58)", marginTop: 5 }}>{sub}</div>}
  </div>
);

const Arrow: React.FC<{ delay: number; label?: string }> = ({ delay, label }) => {
  const frame = useCurrentFrame();
  const grow = interpolate(frame - delay, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, width: 74 }}>
      {label && <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.45)", fontFamily: mono }}>{label}</div>}
      <div style={{ width: `${grow * 100}%`, height: 2, background: "linear-gradient(90deg, rgba(203,227,233,0.15), rgba(203,227,233,0.75))", borderRadius: 2 }} />
    </div>
  );
};

export const ArchitectureScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <SceneWrap duration={DUR} vignetteStrength={0.36}>
      <AbsoluteFill style={{
        background: `radial-gradient(ellipse 80% 70% at 50% 40%, #24383f 0%, #131e22 60%, #0d1417 100%)`,
        alignItems: "center", justifyContent: "center", padding: 70, fontFamily: sans,
      }}>
        <Reveal start={6}>
          <div style={{ textAlign: "center", marginBottom: 44 }}>
            <div style={{ fontSize: 15.5, fontWeight: 800, letterSpacing: "0.17em", textTransform: "uppercase", color: AT.tealSoft, marginBottom: 12 }}>
              the architecture
            </div>
            <div style={{ fontSize: 54, fontWeight: 700, color: "#fff", letterSpacing: "-0.025em" }}>
              Four Qwen models, each with a job
            </div>
          </div>
        </Reveal>

        {/* Pipeline row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 40 }}>
          <Reveal start={40}><Node label="Clinician" sub="plain-English intent" w={210} /></Reveal>
          <Arrow delay={70} />
          <Reveal start={80}><Node label="PHI isolation" sub="coded data only" color={AT.kFhir} w={230} /></Reveal>
          <Arrow delay={110} />
          <Reveal start={120}><Node label="Smart router" sub="complexity → tier" color={AT.kRoute} w={230} /></Reveal>
        </div>

        {/* Model bank */}
        <Reveal start={165}>
          <div style={{
            border: "1px solid rgba(255,255,255,0.16)", borderRadius: 18, padding: "26px 30px 30px",
            background: "rgba(255,255,255,0.035)",
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 20,
              fontSize: 15, fontFamily: mono, color: "rgba(255,255,255,0.72)", letterSpacing: "0.05em",
            }}>
              <span style={{ width: 9, height: 9, borderRadius: 9, background: AT.alibaba }} />
              ALIBABA CLOUD MODEL STUDIO · DASHSCOPE
            </div>
            <div style={{ display: "flex", gap: 16 }}>
              {MODELS.map((m, i) => {
                const at = 190 + i * 26;
                const local = frame - at;
                const o = interpolate(local, [0, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                const y = interpolate(local, [0, 16], [16, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                const pulse = 1 + 0.02 * Math.sin((frame - at) / 9);
                return (
                  <div key={m.name} style={{
                    opacity: o, transform: `translateY(${y}px) scale(${local > 0 ? pulse : 1})`,
                    width: 250, borderRadius: 12, border: `1px solid ${m.color}55`,
                    background: `${m.color}14`, padding: "18px 16px", textAlign: "center",
                  }}>
                    <div style={{ fontFamily: mono, fontSize: 20, fontWeight: 700, color: m.color }}>{m.name}</div>
                    <div style={{ fontSize: 15, color: "rgba(255,255,255,0.62)", marginTop: 6 }}>{m.role}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </Reveal>

        {/* Output row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginTop: 40 }}>
          <Reveal start={330}><Node label="Safety Sentinel" sub="adversarial review" color={AT.kGuard} w={240} /></Reveal>
          <Arrow delay={360} />
          <Reveal start={370}><Node label="Human confirm" sub="the gate that never moves" color={AT.kPropose} w={250} /></Reveal>
          <Arrow delay={400} />
          <Reveal start={410}><Node label="FHIR R4 write" sub="validated + audited" color={AT.kWrite} w={240} /></Reveal>
        </div>

        {frame > 470 && (
          <div style={{
            marginTop: 42, textAlign: "center", fontFamily: mono, fontSize: 19, color: "rgba(255,255,255,0.6)",
            opacity: interpolate(frame, [470, 495, 610, 630], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            lineHeight: 1.6,
          }}>
            Reads auto-execute. Writes only ever queue.
            <br />
            <span style={{ color: AT.tealSoft }}>Also exposed over MCP, so any agent can use the same safe toolset.</span>
          </div>
        )}
      </AbsoluteFill>
    </SceneWrap>
  );
};

export default ArchitectureScene;
