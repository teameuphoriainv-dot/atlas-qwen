#!/usr/bin/env bash
# Generate the Atlas narration track into public/audio/narration.mp3.
#
# Uses ElevenLabs when ELEVENLABS_API_KEY is set (best quality); otherwise
# falls back to macOS `say` so the film always has a voice track.
#
# Usage:
#   ELEVENLABS_API_KEY=sk-... ./generate-vo.sh          # ElevenLabs
#   ./generate-vo.sh                                     # macOS say fallback
#   ELEVENLABS_VOICE_ID=<id> ELEVENLABS_API_KEY=... ./generate-vo.sh
set -euo pipefail
cd "$(dirname "$0")"

OUT="public/audio/narration.mp3"
mkdir -p public/audio
TEXT="$(cat narration.txt)"

# Voice: default to a warm, clear ElevenLabs voice (Rachel) unless overridden.
VOICE_ID="${ELEVENLABS_VOICE_ID:-21m00Tcm4TlvDq8ikWAM}"

if [[ -n "${ELEVENLABS_API_KEY:-}" ]]; then
  echo "→ Generating VO via ElevenLabs (voice $VOICE_ID)…"
  # Build the JSON body safely with python to escape the narration.
  BODY="$(python3 - "$TEXT" <<'PY'
import json, sys
text = sys.argv[1]
print(json.dumps({
    "text": text,
    "model_id": "eleven_multilingual_v2",
    "voice_settings": {"stability": 0.4, "similarity_boost": 0.75, "style": 0.15, "use_speaker_boost": True},
}))
PY
)"
  curl -sS -X POST "https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128" \
    -H "xi-api-key: ${ELEVENLABS_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "$BODY" \
    --output "$OUT"
  # ElevenLabs returns JSON on error; a valid mp3 starts with ID3 or 0xFFFB.
  if head -c 4 "$OUT" | grep -q "{"; then
    echo "✗ ElevenLabs error:"; cat "$OUT"; rm -f "$OUT"; exit 1
  fi
  echo "✓ Wrote $OUT ($(du -h "$OUT" | cut -f1)) via ElevenLabs"
else
  echo "→ No ELEVENLABS_API_KEY — using macOS 'say' fallback."
  TMP_AIFF="$(mktemp -t atlasvo).aiff"
  # Slightly slowed for narration clarity; Ava is a natural macOS voice.
  say -v "${SAY_VOICE:-Ava}" -r "${SAY_RATE:-172}" -o "$TMP_AIFF" "$TEXT"
  if command -v ffmpeg >/dev/null 2>&1; then
    ffmpeg -y -i "$TMP_AIFF" -codec:a libmp3lame -qscale:a 3 "$OUT" >/dev/null 2>&1
    rm -f "$TMP_AIFF"
  else
    OUT="public/audio/narration.aiff"; mv "$TMP_AIFF" "$OUT"
    echo "  (ffmpeg not found — wrote AIFF; update Atlas.tsx audio src if needed)"
  fi
  echo "✓ Wrote $OUT ($(du -h "$OUT" | cut -f1)) via macOS say"
fi
