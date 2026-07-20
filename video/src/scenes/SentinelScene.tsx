/** Act 4 · The Safety Sentinel (630f / 21s) — a second Qwen model refuses the first one's work. */
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { SceneWrap, Reveal } from "../lib/kit";
import { AT } from "../lib/atlas";
import { sans, mono, Typed, AtlasPanel, UserBubble, ProposalCard, LiveConsole, type ConsoleRow } from "../lib/ui";

const DUR = 630;

const ROWS: ConsoleRow[] = [
  { tag: "ROUTE", color: AT.kRoute, text: "router → qwen-plus", detail: "chart-mutating request" },
  { tag: "THINK", color: AT.kThink, text: "reasoning round 1", ms: "1.4s" },
  { tag: "PROPOSE", color: AT.kPropose, text: "propose MedicationRequest", detail: "Amoxicillin 500 mg TID" },
  { tag: "GUARD", color: AT.kGuard, text: "sentinel qwen-max · block", detail: "cross-reactivity with recorded penicillin allergy", ms: "1.3s" },
];

export const SentinelScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <SceneWrap duration={DUR} push={false} vignetteStrength={0.34}>
      <AbsoluteFill style={{
        background: `linear-gradient(155deg, #1b2b31 0%, #121c20 100%)`,
        padding: "56px 70px", fontFamily: sans,
      }}>
        <Reveal start={6}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 15.5, fontWeight: 800, letterSpacing: "0.17em", textTransform: "uppercase", color: AT.kGuard, marginBottom: 12 }}>
              layer two · the safety sentinel
            </div>
            <div style={{ fontSize: 52, fontWeight: 700, color: "#fff", letterSpacing: "-0.025em", lineHeight: 1.1 }}>
              A second Qwen model whose only job
              <br />is to find what the first one got wrong.
            </div>
          </div>
        </Reveal>

        <div style={{ display: "flex", gap: 46, marginTop: 48, alignItems: "flex-start", justifyContent: "center" }}>
          {/* Left: the request + blocked proposal */}
          <div style={{ transform: "scale(0.98)", transformOrigin: "top center" }}>
            <AtlasPanel width={620} subtitle="proposal under review">
              <UserBubble>
                <Typed text="patient has a cough, start amoxicillin 500mg TID" start={40} dur={80} />
              </UserBubble>

              <ProposalCard
                appear={200}
                width={576}
                resourceType="MedicationRequest"
                summary="Amoxicillin 500 mg, oral, three times daily"
                code="RxNorm 308182"
                verdict={frame > 330 ? "block" : undefined}
                reason={frame > 330 ? "Cross-reactivity risk: aminopenicillin proposed against a documented Penicillin G allergy [AllergyIntolerance/7980]" : undefined}
              />

              {frame > 400 && (
                <div style={{
                  opacity: interpolate(frame, [400, 420], [0, 1], { extrapolateRight: "clamp" }),
                  display: "flex", flexDirection: "column", gap: 8, marginTop: 2,
                }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600, color: AT.error }}>
                    The Safety Sentinel flagged item(s) above. Review the reasons before confirming.
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <div style={{ border: `1px solid ${AT.error}`, color: AT.error, background: "#fff", padding: "9px 20px", borderRadius: 7, fontSize: 16, fontWeight: 700 }}>
                      Confirm anyway
                    </div>
                    <div style={{ border: `1px solid ${AT.line}`, color: AT.muted, padding: "9px 20px", borderRadius: 7, fontSize: 16, fontWeight: 600 }}>
                      Reject
                    </div>
                  </div>
                </div>
              )}
            </AtlasPanel>
          </div>

          {/* Right: two-layer explainer + console */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18, width: 600 }}>
            <Reveal start={250}>
              <div style={{ background: "rgba(255,255,255,0.055)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "20px 24px" }}>
                <div style={{ fontSize: 13.5, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: AT.kFhir, marginBottom: 10 }}>
                  layer 1 · deterministic rules
                </div>
                <div style={{ fontSize: 19.5, color: "rgba(255,255,255,0.88)", lineHeight: 1.45 }}>
                  Allergy conflicts and duplicate therapy caught in code. No model involved. Unit-tested.
                </div>
              </div>
            </Reveal>

            <Reveal start={295}>
              <div style={{ background: "rgba(196,181,253,0.09)", border: "1px solid rgba(196,181,253,0.28)", borderRadius: 12, padding: "20px 24px" }}>
                <div style={{ fontSize: 13.5, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: AT.kThink, marginBottom: 10 }}>
                  layer 2 · adversarial qwen-max
                </div>
                <div style={{ fontSize: 19.5, color: "rgba(255,255,255,0.88)", lineHeight: 1.45 }}>
                  An independent reviewer prompted to refute: interactions, cross-reactivity classes,
                  contraindications, implausible doses, wrong codes.
                </div>
              </div>
            </Reveal>

            <Reveal start={430}>
              <LiveConsole rows={ROWS} start={440} stagger={26} width={600} title="Live System Console" />
            </Reveal>
          </div>
        </div>

        {frame > 520 && (
          <div style={{
            position: "absolute", bottom: 34, left: 0, right: 0, textAlign: "center",
            opacity: interpolate(frame, [520, 545, 610, 630], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            fontFamily: mono, fontSize: 20, color: AT.tealSoft, letterSpacing: "0.02em",
          }}>
            The author never grades its own homework.
          </div>
        )}
      </AbsoluteFill>
    </SceneWrap>
  );
};

export default SentinelScene;
