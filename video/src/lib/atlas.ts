/**
 * Atlas demo tokens — 1:1 with the product (src/app/globals.css) plus the
 * Qwen / Alibaba Cloud accents used for the model-orchestration scenes.
 */
export const AT = {
  // Product palette (Clinical Sanctuary)
  teal: "#2a474e",
  tealDeep: "#223b41",
  tealSoft: "#cbe3e9",
  page: "#f8f9f9",
  surface: "#ffffff",
  surfaceAlt: "#f3f4f4",
  ink: "#1a2023",
  muted: "#4a5557",
  line: "rgba(74,85,87,0.2)",
  success: "#557d6e",
  warning: "#b05436",
  error: "#ba1a1a",
  info: "#406372",

  // Console (dark dev-tools overlay)
  consoleBg: "#0d1417",
  consoleInk: "#e2e8f0",
  consoleDim: "#64748b",

  // Live System Console row colors (match LiveConsole.tsx)
  kHttp: "#7dd3fc",
  kFhir: "#6ee7b7",
  kThink: "#c4b5fd",
  kPropose: "#fcd34d",
  kWrite: "#a7f3d0",
  kRoute: "#67e8f9",
  kGuard: "#fda4af",

  // Qwen / Alibaba accent
  qwen: "#615ced",
  qwenSoft: "#e8e7fd",
  alibaba: "#ff6a00",
};

/** Model tiers used across the architecture scenes. */
export const MODELS = [
  { name: "qwen-turbo", role: "simple asks", color: "#67e8f9" },
  { name: "qwen-plus", role: "agent loop", color: "#7dd3fc" },
  { name: "qwen-max", role: "drafting + Safety Sentinel", color: "#c4b5fd" },
  { name: "qwen-vl-max", role: "photo → structured meds", color: "#fcd34d" },
];
