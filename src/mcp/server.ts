/**
 * Atlas MCP server: exposes Atlas's PHI-safe clinical toolset over the Model
 * Context Protocol, so ANY MCP-capable agent (a Qwen agent on Alibaba Cloud
 * Model Studio, Claude, an IDE assistant) can work with a FHIR chart through
 * the exact same safety machinery the Atlas UI uses:
 *
 *   - every chart read is PHI-sanitized (same sanitize.ts, test-enforced)
 *   - resources are structurally validated before they could ever be written
 *   - proposed actions get a Safety Sentinel review (rules always; the
 *     adversarial qwen-max layer joins automatically when QWEN_API_KEY is set)
 *   - writes are NEVER executed here: this server stages and reviews only,
 *     preserving the human-confirm gate as an architectural invariant
 *
 * Run:  npm run mcp        (stdio transport)
 * Env:  FHIR_BASE_URL (default: public HAPI R4), NEXT_PUBLIC_USE_MOCK_FHIR=true
 *       for the built-in synthetic patient, QWEN_API_KEY to enable the model
 *       layer of the sentinel.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { sanitize, sanitizeBundle } from "@/lib/agent/sanitize";
import { validateResource } from "@/lib/fhir/validate";
import { runRuleChecks, runModelReview } from "@/lib/agent/sentinel";
import { makeBuiltinFhir } from "@/lib/fhir/remote";
import type { ProposedAction } from "@/lib/agent/runAgent";

const fhir = makeBuiltinFhir();

const server = new McpServer({ name: "atlas-fhir", version: "1.0.0" });

server.registerTool(
  "read_chart",
  {
    description:
      "Read a patient's chart as a PHI-stripped snapshot (conditions, observations, medications, allergies, orders). Direct identifiers never leave this server.",
    inputSchema: {
      patientRef: z.string().describe("FHIR patient reference, e.g. Patient/mock-demo-1"),
    },
  },
  async ({ patientRef }) => {
    const [cond, obs, meds, alg, srv] = await Promise.all([
      fhir.search("Condition", `subject=${patientRef}&_count=50`).catch(() => null),
      fhir.search("Observation", `patient=${patientRef}&_count=50`).catch(() => null),
      fhir.search("MedicationStatement", `subject=${patientRef}&_count=50`).catch(() => null),
      fhir.search("AllergyIntolerance", `patient=${patientRef}&_count=50`).catch(() => null),
      fhir.search("ServiceRequest", `subject=${patientRef}&_count=50`).catch(() => null),
    ]);
    const snapshot = {
      conditions: cond ? sanitizeBundle(cond) : null,
      observations: obs ? sanitizeBundle(obs) : null,
      medications: meds ? sanitizeBundle(meds) : null,
      allergies: alg ? sanitizeBundle(alg) : null,
      orders: srv ? sanitizeBundle(srv) : null,
    };
    return { content: [{ type: "text", text: JSON.stringify(snapshot).slice(0, 20000) }] };
  },
);

server.registerTool(
  "search_fhir",
  {
    description:
      "Search any FHIR R4 resource type; results are PHI-sanitized (codes, values, statuses, dates only). Scope queries to a patient, e.g. 'subject=Patient/123'.",
    inputSchema: {
      resourceType: z.string().describe("e.g. Condition, Observation, MedicationRequest"),
      query: z.string().default("").describe("URL query string, e.g. 'subject=Patient/123&_count=20'"),
    },
  },
  async ({ resourceType, query }) => {
    const data = await fhir.search(resourceType, query);
    return { content: [{ type: "text", text: JSON.stringify(sanitizeBundle(data)).slice(0, 20000) }] };
  },
);

server.registerTool(
  "read_fhir",
  {
    description: "Read one FHIR resource by id, PHI-sanitized.",
    inputSchema: {
      resourceType: z.string(),
      id: z.string(),
    },
  },
  async ({ resourceType, id }) => {
    const data = await fhir.read(resourceType, id);
    return { content: [{ type: "text", text: JSON.stringify(sanitize(data)).slice(0, 12000) }] };
  },
);

server.registerTool(
  "validate_fhir_resource",
  {
    description:
      "Structurally validate a FHIR R4 resource against Atlas's write-boundary rules (required fields, valid statuses, dosing present on medications). Returns valid + errors.",
    inputSchema: {
      resourceType: z.string(),
      resource: z.record(z.string(), z.unknown()),
    },
  },
  async ({ resourceType, resource }) => {
    const result = validateResource(resourceType, resource as Record<string, unknown>);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  },
);

server.registerTool(
  "safety_review",
  {
    description:
      "Run the Atlas Safety Sentinel over proposed chart writes for a patient: deterministic allergy/duplicate rule checks against the live chart, plus an adversarial Qwen clinical review when QWEN_API_KEY is configured. Returns a pass/warn/block verdict with reasons per action. This does NOT write anything: Atlas never writes without a human confirm.",
    inputSchema: {
      patientRef: z.string(),
      actions: z
        .array(
          z.object({
            resourceType: z.string(),
            summary: z.string(),
            resource: z.record(z.string(), z.unknown()),
          }),
        )
        .min(1),
    },
  },
  async ({ patientRef, actions }) => {
    const [cond, meds, alg] = await Promise.all([
      fhir.search("Condition", `subject=${patientRef}&_count=50`).catch(() => null),
      fhir.search("MedicationStatement", `subject=${patientRef}&_count=50`).catch(() => null),
      fhir.search("AllergyIntolerance", `patient=${patientRef}&_count=50`).catch(() => null),
    ]);
    const snapshot = JSON.stringify({
      conditions: cond ? sanitizeBundle(cond) : null,
      medications: meds ? sanitizeBundle(meds) : null,
      allergies: alg ? sanitizeBundle(alg) : null,
      orders: null,
    });
    const acts = actions as ProposedAction[];
    const rules = runRuleChecks(acts, snapshot);
    const model = process.env.QWEN_API_KEY ? await runModelReview(acts, snapshot).catch(() => null) : null;
    const reviews = acts.map((_, i) => {
      const r = rules[i];
      if (!model) return { ...r, layers: ["rules"] };
      const m = model[i];
      const order = { pass: 0, unreviewed: 1, warn: 2, block: 3 } as const;
      return {
        verdict: order[r.verdict] >= order[m.verdict] ? r.verdict : m.verdict,
        reasons: [...r.reasons, ...m.reasons],
        layers: ["rules", "qwen-max"],
      };
    });
    return { content: [{ type: "text", text: JSON.stringify({ reviews }) }] };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Atlas MCP server (atlas-fhir) listening on stdio");
}

main().catch((e) => {
  console.error("Atlas MCP server failed to start:", e);
  process.exit(1);
});
