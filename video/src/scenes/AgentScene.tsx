/** Act 3 · The autopilot moment (780f / 26s) — intent → tool loop → coded proposals → confirm. */
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { SceneWrap } from "../lib/kit";
import { AT } from "../lib/atlas";
import {
  sans, mono, Typed, EhrChrome, ChartCard, LiveConsole, ProposalCard,
  AtlasPanel, UserBubble, AtlasBubble, EvidenceChip, type ConsoleRow,
} from "../lib/ui";

const DUR = 780;

const ROWS: ConsoleRow[] = [
  { tag: "ROUTE", color: AT.kRoute, text: "router → qwen-plus", detail: "standard · chart-mutating request" },
  { tag: "FHIR", color: AT.kFhir, text: "Snapshot ×5 resources", detail: "Condition · Observation · Medication · Allergy · Order", ms: "212ms" },
  { tag: "THINK", color: AT.kThink, text: "reasoning round 1", detail: "418 tok out · qwen-plus", ms: "1.6s" },
  { tag: "PROPOSE", color: AT.kPropose, text: "propose ServiceRequest", detail: "CBC with differential" },
  { tag: "PROPOSE", color: AT.kPropose, text: "propose ServiceRequest", detail: "Chest X-ray, 2 views" },
  { tag: "PROPOSE", color: AT.kPropose, text: "propose MedicationRequest", detail: "Metformin 500 mg BID" },
  { tag: "GUARD", color: AT.kGuard, text: "sentinel qwen-max · pass", detail: "3 actions reviewed", ms: "1.1s" },
  { tag: "INFO", color: AT.consoleDim, text: "3,412 tokens · 1 round · ~$0.0018", detail: "3,041 in / 371 out" },
];

export const AgentScene: React.FC = () => {
  const frame = useCurrentFrame();
  const confirmed = frame > 660;
  const panelSlide = interpolate(frame, [10, 40], [40, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <SceneWrap duration={DUR} push={false} vignetteStrength={0.22}>
      <AbsoluteFill style={{ background: "#eef2f5" }}>
        <EhrChrome />

        {/* Patient banner */}
        <div style={{ display: "flex", alignItems: "center", gap: 34, background: "#eff6ff", borderBottom: "1px solid #cbd5e1", padding: "12px 24px", fontFamily: sans }}>
          <div>
            <div style={{ fontSize: 19, fontWeight: 700, color: "#1e293b" }}>Riley Demo</div>
            <div style={{ fontSize: 14, color: "#64748b" }}>MRN 00mock-1 · female · 50-59 yrs</div>
          </div>
          <div style={{ display: "flex", gap: 26, fontSize: 14, color: "#64748b" }}>
            <span><b style={{ color: "#334155" }}>4</b> problems</span>
            <span><b style={{ color: "#334155" }}>3</b> meds</span>
            <span><b style={{ color: "#dc2626" }}>1</b> allergy</span>
          </div>
        </div>

        {/* Chart grid */}
        <div style={{ display: "flex", gap: 16, padding: "18px 24px" }}>
          <ChartCard title="Problem List" width={330} items={[
            { label: "Type 2 diabetes mellitus", code: "44054006" },
            { label: "Essential hypertension", code: "59621000" },
            { label: "Hyperlipidemia", code: "55822004" },
          ]} />
          <ChartCard title="Medications" width={330} highlight={confirmed} items={[
            { label: "Lisinopril 10 mg daily", code: "314076" },
            { label: "Atorvastatin 20 mg", code: "617311" },
            ...(confirmed ? [{ label: "Metformin 500 mg BID", code: "860975" }] : []),
          ]} />
          <ChartCard title="Allergies" width={300} items={[{ label: "Penicillin G", code: "7980" }]} />
        </div>

        {/* Orders section, fills after confirm */}
        <div style={{ padding: "0 24px" }}>
          <ChartCard title="Orders" width={996} highlight={confirmed} items={
            confirmed
              ? [{ label: "CBC with differential", code: "58410-2" }, { label: "Chest X-ray, 2 views", code: "36643-5" }]
              : [{ label: "No active orders" }]
          } />
        </div>

        {/* Live console bottom-left */}
        <div style={{ position: "absolute", left: 30, bottom: 30 }}>
          <LiveConsole rows={ROWS} start={150} stagger={34} width={640} />
        </div>

        {/* Floating Atlas panel */}
        <div style={{ position: "absolute", right: 40, top: 150, transform: `translateY(${panelSlide}px)` }}>
          <AtlasPanel width={600}>
            <UserBubble>
              <Typed text="order a CBC and a chest x-ray, and start metformin 500mg BID" start={30} dur={110} />
            </UserBubble>

            <AtlasBubble appear={430}>
              Drafted 3 orders. She is on lisinopril <EvidenceChip label="MedicationRequest/314076" /> with
              T2DM <EvidenceChip label="Condition/44054006" /> — metformin is appropriate first-line.
            </AtlasBubble>

            <ProposalCard appear={470} width={556} resourceType="ServiceRequest"
              summary="CBC with differential" code="LOINC 58410-2" verdict="pass" />
            <ProposalCard appear={500} width={556} resourceType="ServiceRequest"
              summary="Chest X-ray, 2 views" code="LOINC 36643-5" verdict="pass" />
            <ProposalCard appear={530} width={556} resourceType="MedicationRequest"
              summary="Metformin 500 mg, oral, twice daily" code="RxNorm 860975" verdict="pass" />

            {/* Confirm bar */}
            {frame > 570 && (
              <div style={{ display: "flex", gap: 10, marginTop: 2, opacity: interpolate(frame, [570, 585], [0, 1], { extrapolateRight: "clamp" }) }}>
                <div style={{
                  background: confirmed ? AT.success : AT.teal, color: "#fff", padding: "9px 20px",
                  borderRadius: 7, fontSize: 16, fontWeight: 700, fontFamily: sans,
                  transform: frame > 655 && frame < 670 ? "scale(0.96)" : "scale(1)",
                }}>
                  {confirmed ? "✓ Wrote 3 items to the chart" : "Confirm 3"}
                </div>
                {!confirmed && (
                  <div style={{ border: `1px solid ${AT.error}55`, color: AT.error, padding: "9px 20px", borderRadius: 7, fontSize: 16, fontWeight: 600, fontFamily: sans }}>
                    Reject
                  </div>
                )}
              </div>
            )}
          </AtlasPanel>
        </div>

        {/* Lower caption band */}
        {frame > 600 && (
          <div style={{
            position: "absolute", left: 30, bottom: 400, maxWidth: 640,
            opacity: interpolate(frame, [600, 620, 760, 780], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            background: "rgba(13,20,23,0.9)", color: "#fff", borderRadius: 10, padding: "14px 20px",
            fontFamily: mono, fontSize: 16, lineHeight: 1.5,
          }}>
            The model never saw a name, an MRN, or a date of birth.
            <div style={{ color: AT.kFhir, marginTop: 4 }}>PHI isolation enforced by a test that fails the build.</div>
          </div>
        )}
      </AbsoluteFill>
    </SceneWrap>
  );
};

export default AgentScene;
