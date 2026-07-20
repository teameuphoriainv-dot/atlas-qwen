/**
 * Brand fonts, loaded via @remotion/google-fonts so renders are deterministic
 * and offline-safe. Mirrors the landing site:
 *   Instrument Serif  → hero display headlines
 *   Figtree           → section headers + consumer UI (hims&hers "Sofia" match)
 *   DM Sans           → Atlas clinician terminal
 *   JetBrains Mono    → data / codes / tokens
 */
import { loadFont as loadInstrument } from "@remotion/google-fonts/InstrumentSerif";
import { loadFont as loadFigtree } from "@remotion/google-fonts/Figtree";
import { loadFont as loadDMSans } from "@remotion/google-fonts/DMSans";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

export const serif = loadInstrument().fontFamily; // "Instrument Serif"
export const sofia = loadFigtree().fontFamily; // "Figtree"
export const dmsans = loadDMSans().fontFamily; // "DM Sans"
export const mono = loadMono().fontFamily; // "JetBrains Mono"
