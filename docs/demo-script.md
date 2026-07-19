# Atlas: Demo Video Script (~3 minutes)

For the Global AI Hackathon with Qwen Cloud, Track 4: Autopilot Agent.
Record the screen at 1080p with voiceover; upload public to YouTube.

## Setup (before recording)
- `npm run dev` running, browser at `http://localhost:3000`.
- `QWEN_API_KEY` set in `.env.local` (Alibaba Cloud Model Studio).
- Demo patient pinned via `DEMO_PATIENT_ID`, or `NEXT_PUBLIC_USE_MOCK_FHIR=true` for the
  zero-dependency mock patient (Riley Demo). The mock is the safe choice for recording.
- Open the **Live System Console** (bottom-left) before you start: it visualizes the agent's
  key logic in real time, which judges score directly.

## 0:00-0:25 — The hook
> "Doctors spend more time fighting their EHR than talking to patients. Order entry is the
> worst of it: endless menu-diving, dozens of times a day. Atlas is an autopilot agent for
> that workflow, powered end-to-end by Qwen on Alibaba Cloud. You say what you want; the
> agent reads the chart, does the work, and you confirm every write."

## 0:25-0:50 — Orient
1. Show the workspace: "A live FHIR chart on the left; Atlas floats over it, like it would
   over any EHR."
2. Point at the Live System Console: "Down here you can watch the agent think: every FHIR
   call, every Qwen reasoning round, real latencies and token counts."

## 0:50-1:45 — The autopilot moment (ambiguous input → tools → human-in-the-loop)
3. Type (or use the mic):
   > `order a CBC and a chest x-ray, and start metformin 500mg BID`
4. Narrate the console while it works: "Qwen-plus is running a bounded tool loop: it
   searched the chart over FHIR, reasoned over the results, and now it's proposing
   correctly-coded orders: LOINC for the labs, RxNorm for the med."
5. **The wow line:** "It caught context from the chart on its own, and it did all of that
   without ever seeing the patient's name, date of birth, or MRN. The model only gets
   de-identified coded data, and a test suite fails our build if that ever changes."
6. **Confirm once.** Orders write back and appear in the chart. "Nothing is written until a
   clinician clicks confirm. That's the human-in-the-loop checkpoint, and every action
   lands in the audit log."

## 1:45-2:15 — Ambiguity handling + breadth
7. Type `start lisinopril` (no dose) → Atlas asks a clarifying question instead of
   guessing. "Ambiguous input becomes a question, never a guessed dose."
8. Quick-fire one more chip (care gaps or summarize): "Same agent, open-ended asks."
9. Optional 10s: screenshot-OCR button → "That OCR is Qwen-VL, also on Alibaba Cloud."

## 2:15-2:45 — Architecture flash
10. Cut to the README architecture diagram for ~15 seconds:
> "Everything model-side runs on Alibaba Cloud Model Studio: qwen-plus drives the agent
> loop, qwen-max drafts structured orders through forced function calls, qwen-vl-max does
> OCR. The backend is a thin Next.js layer over FHIR R4, with a PHI-isolation boundary
> between the chart and the model, enforced in CI."

## 2:45-3:00 — The close
> "Atlas speaks FHIR, so it works with any compliant EHR; we've also connected it to
> Epic's sandbox through a Chrome extension with SMART-on-FHIR. This is what production
> autopilot looks like in healthcare: real tools, real ambiguity, and a human holding the
> pen. Atlas, built on Qwen Cloud."

## Talking points if asked (live judging / comments)
- **"Is it touching patient data?"** The model only sees coded context (codes, values,
  banded age). Names/MRN/DOB never leave the server; `src/lib/phi/isolate.test.ts` fails
  the build if that changes.
- **"Does it work with Epic?"** It speaks FHIR R4. The extension does SMART-on-FHIR PKCE
  against Epic's sandbox; the web demo uses HAPI/mock synthetic patients.
- **"What if it's wrong?"** Nothing writes without explicit confirm; ambiguous orders
  become questions; the tool loop is bounded (5 rounds, 5 proposals max).
