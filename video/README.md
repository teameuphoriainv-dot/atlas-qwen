# Atlas demo film (Remotion)

A ~113s cinematic explainer for the Global AI Hackathon with Qwen Cloud (Track 4).
Rendered output: `out/atlas-qwen-demo.mp4` (1920×1080, h264 + aac).

## Render
```bash
npm install
./generate-vo.sh                 # narration → public/audio/narration.mp3
                                 # (ELEVENLABS_API_KEY=... for studio-quality voice)
npm run render                   # → out/atlas-qwen-demo.mp4
npm run dev                      # Remotion Studio (live preview)
```

## Voiceover
`narration.txt` is the script. `generate-vo.sh` renders it to
`public/audio/narration.mp3` — via **ElevenLabs** when `ELEVENLABS_API_KEY` is set
(recommended for the final cut), otherwise a macOS `say` fallback so the film always
has a track. The track is time-fit to the 113s cut.

## Acts
Title · The problem · The autopilot moment · The Safety Sentinel · Architecture (four
Qwen models) · Production rigor · Close.
