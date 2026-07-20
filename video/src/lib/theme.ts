/**
 * Solace demo design tokens — extracted 1:1 from the landing repo
 * (tailwind.config.js) and the Atlas terminal components.
 *
 * Two brands on purpose:
 *   CONSUMER (green/mint, Figtree + Instrument Serif) — patient-facing + marketing
 *   ATLAS    (teal, DM Sans + JetBrains Mono)         — clinician terminal
 */
import { Easing } from "remotion";
import { serif, sofia, dmsans, mono } from "./fonts";

export const FONTS = { serif, sofia, dmsans, mono };

// Consumer / marketing brand (green axis)
export const C = {
  green: "#0B6B53",
  green600: "#0F8A68",
  green900: "#063B2E",
  mint: "#1FBF8F",
  soft: "#E7F4EF",
  soft50: "#E7F4EF",
  ink: "#0A0F0D",
  muted: "#5B6B64",
  offwhite: "#F6FAF8",
  paper: "#f0f0f0",
  white: "#FFFFFF",
  slate: "#3C5560",
};

// Atlas clinician terminal palette
export const A = {
  page: "#f8f9f9",
  rail: "#f3f4f4",
  ink: "#1a2023",
  muted: "#4a5557",
  teal: "#2a474e",
  active: "#cbe3e9",
  hair: "rgba(74,85,87,0.2)",
  white: "#FFFFFF",
};

// ESI acuity scale (shared)
export const ESI: Record<number, string> = {
  1: "#BA1A1A",
  2: "#b05436", // burnt-amber pushes acuity up
  3: "#b8924a",
  4: "#4a5557",
  5: "#557d6e",
};

export const MUST_NOT_MISS = "#ba1a1a";
export const SHAP_UP = "#b05436";
export const SHAP_DOWN = "#557d6e";

// Motion curves (match landing's hims curves)
export const EASE_OUT = Easing.bezier(0.19, 1, 0.22, 1); // hims-expo
export const EASE_IN_OUT = Easing.bezier(0.4, 0, 0.2, 1);
export const EASE_HIMS = Easing.bezier(0.215, 0.61, 0.355, 1); // hims-out

export const FPS = 30;
