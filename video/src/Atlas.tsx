/**
 * Atlas demo film — Global AI Hackathon with Qwen Cloud (Track 4: Autopilot Agent).
 * 3390 frames @ 30fps = 113s. Cinematic cut with 24-frame crossfade overlaps.
 *
 * Acts:
 *   0    -  270   Title                                    (9 s)
 *   246  -  696   The problem: 14 clicks for one sentence  (15 s)
 *   672  - 1452   The autopilot moment (agent tool loop)   (26 s)
 *   1428 - 2058   The Safety Sentinel blocks a write       (21 s)
 *   2034 - 2664   Architecture: four Qwen models           (21 s)
 *   2640 - 3090   Production rigor                         (15 s)
 *   3066 - 3366   Close                                    (10 s)
 *
 * Voiceover (public/audio/narration.mp3) is layered over the whole film when
 * present; the film reads without it, so a missing track never breaks a render.
 */
import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import TitleScene from "./scenes/TitleScene";
import ProblemScene from "./scenes/ProblemScene";
import AgentScene from "./scenes/AgentScene";
import SentinelScene from "./scenes/SentinelScene";
import ArchitectureScene from "./scenes/ArchitectureScene";
import RigorScene from "./scenes/RigorScene";
import CloseScene from "./scenes/CloseScene";

export const ATLAS_FPS = 30;
export const ATLAS_DURATION = 3366;

/** Set to false to render a clean (music/VO-free) master. */
const WITH_NARRATION = true;

export const Atlas: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "black" }}>
      {WITH_NARRATION && (
        <Audio src={staticFile("audio/narration.mp3")} volume={1} />
      )}

      <Sequence from={0} durationInFrames={270}><TitleScene /></Sequence>
      <Sequence from={246} durationInFrames={450}><ProblemScene /></Sequence>
      <Sequence from={672} durationInFrames={780}><AgentScene /></Sequence>
      <Sequence from={1428} durationInFrames={630}><SentinelScene /></Sequence>
      <Sequence from={2034} durationInFrames={630}><ArchitectureScene /></Sequence>
      <Sequence from={2640} durationInFrames={450}><RigorScene /></Sequence>
      <Sequence from={3066} durationInFrames={300}><CloseScene /></Sequence>
    </AbsoluteFill>
  );
};

export default Atlas;
