# Atlas vs. the 2026 Clinical-AI Rigor Bar

We benchmarked Atlas against the publicly documented architectures of the leading
clinical AI copilots: Abridge, Microsoft Dragon Copilot (Nuance DAX), Ambience
Healthcare, Hippocratic AI, Navina, Regard, Suki, Glass Health, OpenEvidence, and
Epic's native AI features. Below: what defines the industry bar, and where Atlas
stands. Honest scoring: hackathon scope is marked as such.

## What the leaders converge on

| Bar element | Who set it | Atlas status |
|---|---|---|
| Draft-not-commit, human-in-the-loop on every write | Universal (Abridge, DAX, Epic, Suki, Regard) | YES: every write queues for explicit confirm; audit-logged |
| Supervisory / guardian model tier checking the primary model | Hippocratic AI's Polaris "constellation" (~22 cooperating models, arXiv 2403.13313) | YES: Qwen Safety Sentinel, an independent qwen-max adversarial reviewer + deterministic rule layer |
| Task-appropriate model routing (different models for different jobs) | DAX (Dragon ASR + GPT-4), Hippocratic | YES: smart router across qwen-turbo / plus / max, decision visible in the console |
| Per-claim evidence provenance | Abridge "Linked Evidence", Navina, Regard, OpenEvidence per-sentence citations | YES: agent cites [Type/id] FHIR references per claim; validated + rendered as evidence chips |
| Chart/longitudinal awareness, not just the live utterance | Ambience "Chart Awareness", Navina, Regard | YES: PHI-stripped 5-resource chart snapshot preloaded into every turn |
| Structured clinical reasoning with a can't-miss tier | Glass Health tiered DDx | YES: tiered differential (Most Likely / Expanded / Can't-Miss) as a first-class flow |
| Guardrails vs automation bias | Glass (named risk), Epic (review-before-send) | YES: sentinel-flagged proposals switch the confirm affordance to an explicit "Confirm anyway" with reasons shown |
| Minimal PHI exposure to models | Glass (PHI-prohibited), Abridge (audio not retained) | YES: strict coded-only isolation, enforced by a 6-assertion CI test |
| Write-boundary validation of model output | Implied by every draft-not-commit design | YES: structural FHIR validator rejects malformed resources before the server sees them |
| Tamper-evident auditability | Enterprise GRC posture (Abridge SOC 2 + ISO 27001) | YES (architecture): SHA-256 hash-chained audit log with chain verification endpoint |
| Deep bi-directional EHR integration | Suki (4 major EHRs), Abridge/DAX (Epic-native) | PARTIAL: FHIR R4 read/write (HAPI live) + Epic sandbox via SMART-on-FHIR Chrome extension; no Toolbox-program embed (enterprise scope) |
| Measured hallucination rate, PDQI-9/QUEST evals | Eval literature (Frontiers 2025; medRxiv 2024) | PARTIAL: live coded-order success-rate eval (key-gated); citation validity is deterministically enforced; full eval panel is post-hackathon scope |
| Certifications: SOC 2 Type 2, ISO 27001, HITRUST | Abridge (reference posture) | NO (honest): architecture aligns with the controls (encryption, isolation, audit integrity), but certification is an organizational process, not a codebase feature |
| Ambient audio capture | Abridge, DAX, Ambience, Suki | NO (deliberate): Atlas is a chart-action agent, not a scribe; voice input exists but ambient scribing is out of scope, which also avoids the state wiretap-consent exposure ambient vendors carry |

## The three ideas we adopted directly from this benchmark

1. **Evidence provenance** (from Abridge/Navina/Regard/OpenEvidence): the agent now
   cites the exact FHIR resources behind each claim; the UI renders them as chips.
   Citations are validated deterministically; a malformed or invented reference
   format is dropped, never displayed.
2. **Constellation-style supervision** (from Hippocratic AI): our Safety Sentinel is
   exactly their thesis at hackathon scale: safety from *multiple* models, with an
   independent reviewer between the primary model and the human.
3. **Automation-bias UX** (from Glass/Epic): flagged proposals cannot be one-click
   confirmed with the default affordance; the clinician sees the sentinel's reasons
   and must choose "Confirm anyway."

## Sources

Company engineering blogs, peer-reviewed papers (Polaris: arXiv 2403.13313), press
and independent analyses, gathered 2026-07-19. Key links: abridge.com/cds,
hippocraticai.com/polaris-3, ambiencehealthcare.com/blog, navina.ai/core-technology,
regard.com, suki.ai, clinicalaireport.com/reviews/glass-health, epic.com/epic/post/
epic-and-microsoft-bring-gpt-4-to-ehrs, frontiersin.org (frai.2025.1691499).
