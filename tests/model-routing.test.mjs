// Project routing tests (Gourmet Kitchen / DietApp).
// Tests the GLOBAL router with MOCKED state only (no model calls, no network), plus
// consistency of the project policy with the recorded live-catalog snapshot.
// Run: node --test tests/model-routing.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const ROUTER = join(homedir(), ".config", "opencode", "model-routing", "router.mjs");
const { selectRoute, classifyFailure, planResume } = await import(pathToFileURL(ROUTER).href);
const policy = JSON.parse(
  readFileSync(join(homedir(), ".config", "opencode", "model-routing", "policy.json"), "utf8"),
);
const projectPolicy = JSON.parse(
  readFileSync(new URL("../config/model-routing.policy.json", import.meta.url), "utf8"),
);
const evidence = JSON.parse(
  readFileSync(join(homedir(), ".config", "opencode", "model-routing", "evidence.json"), "utf8"),
);

const base = {
  goAvailable: true,
  freePoolAvailable: true,
  taskScope: "general",
  catalog: policy.goOrder.concat(policy.freeOrder),
  disabledModels: [],
  unsuitableModels: [],
  evidenceAgeHours: 1,
  allowPaidOverage: false,
  fallbackTransitions: 0,
};

// --- Project policy consistency -------------------------------------------------
test("project policy composes with the global policy, with only project deltas", () => {
  assert.equal(projectPolicy.primaryModel, policy.primaryModel);
  assert.ok(!("goOrder" in projectPolicy), "ordering stays global; project file carries deltas only");
  assert.ok(projectPolicy.projectPrivacyGates.privateSources.length >= 2);
});

test("primary model and all ranked models exist in the recorded live catalog", () => {
  assert.ok(evidence.liveCatalog.includes(policy.primaryModel), "primary must be in snapshot");
  for (const id of [...policy.goOrder, ...policy.freeOrder]) {
    assert.ok(evidence.liveCatalog.includes(id), `${id} absent from snapshot`);
  }
});

test("private-data gate excludes Beam Free and feedback-collecting models for private tasks", () => {
  const risky = [
    "opencode/beam-free",
    "opencode/mimo-v2.6-flash-free",
    "opencode/big-pickle",
    "opencode/flint-40b-free",
    "opencode/nemotron-3.5-lightning-free",
    "opencode-go/iceman-contributor-free",
  ];
  const p = { ...policy, goOrder: [policy.primaryModel], freeOrder: risky };
  const r = selectRoute(p, { ...base, goAvailable: false, taskScope: "private" });
  assert.equal(r.model, null, "no risky model may be auto-selected for private data");
  assert.equal(r.action, "stop");
});

test("go-exhausted state guides fallback to the ZDR free primary", () => {
  const r = selectRoute(policy, { ...base, goAvailable: false });
  assert.equal(r.model, "opencode/glm-5.3-flash-free");
  assert.equal(r.requiresManualModelPick, true);
});

test("stale evidence (>24h) forces revalidation before any selection", () => {
  const r = selectRoute(policy, { ...base, evidenceAgeHours: 30 });
  assert.equal(r.action, "revalidate_first");
  assert.equal(r.model, null);
});

test("auth and billing failures never trigger a model switch", () => {
  assert.equal(classifyFailure({ status: 401 }).retryDifferentModel, false);
  assert.equal(classifyFailure({ billing: true }).action, "stop");
});

test("coding failure is distinct from provider failure (diagnose, not panic switch)", () => {
  const c = classifyFailure({ code: "model_failure" });
  assert.equal(c.type, "model_failure");
  assert.equal(c.retryDifferentModel, true, "guided switch is allowed after diagnosis");
  const q = classifyFailure({ status: 429, scope: "account" });
  assert.equal(q.retryDifferentModel, false, "account-wide 429 must NOT switch models");
});

test("checkpoint semantics: skip verified steps, resume only unfinished", () => {
  const cp = { status: "in_progress", steps: [{ name: "a", done: true }, { name: "b" }, { name: "c", verify: "npm run lint" }] };
  const r = planResume(cp);
  assert.deepEqual(r.remaining.map((s) => s.name), ["b", "c"]);
  assert.deepEqual(planResume({ status: "verified", steps: [] }), { action: "skip_duplicate", remaining: [] });
});

test("project opencode.json exists and points at the verified primary with a schema", () => {
  const file = new URL("../opencode.json", import.meta.url);
  assert.ok(existsSync(file), "project opencode.json must exist");
  const cfg = JSON.parse(readFileSync(file, "utf8"));
  assert.equal(cfg.model, "opencode-go/glm-5.3-flash");
  assert.equal(cfg["$schema"], "https://opencode.ai/config.json");
});
