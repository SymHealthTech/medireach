/**
 * Regression coverage for the on-device consult draft (Stage 0/1 offline
 * handling). The module short-circuits when `window` is undefined (SSR), so we
 * install a minimal window + localStorage before importing it.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

class MemoryStorage {
  private m = new Map<string, string>();
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.m.set(k, String(v)); }
  removeItem(k: string) { this.m.delete(k); }
  clear() { this.m.clear(); }
}

const storage = new MemoryStorage();
// @ts-expect-error — test shim for the browser global the module reads.
globalThis.window = { localStorage: storage };

const { saveConsultDraft, loadConsultDraft, clearConsultDraft } = await import("@/lib/client/consultDraft");

interface Form { co: string; medicines: { name: string }[] }
const edits = { name: "Asha", mobile: "9990001111" };

describe("consultDraft", () => {
  beforeEach(() => storage.clear());

  it("round-trips a saved draft for a visit", () => {
    const form: Form = { co: "fever, 3 days", medicines: [{ name: "Paracetamol" }] };
    saveConsultDraft("visit-1", form, edits);

    const loaded = loadConsultDraft<Form, typeof edits>("visit-1");
    expect(loaded).not.toBeNull();
    expect(loaded!.form).toEqual(form);
    expect(loaded!.patientEdits).toEqual(edits);
    expect(loaded!.savedAt).toBeTypeOf("number");
  });

  it("keeps drafts separate per visitId", () => {
    saveConsultDraft("visit-1", { co: "A", medicines: [] }, edits);
    saveConsultDraft("visit-2", { co: "B", medicines: [] }, edits);
    expect(loadConsultDraft<Form, typeof edits>("visit-1")!.form.co).toBe("A");
    expect(loadConsultDraft<Form, typeof edits>("visit-2")!.form.co).toBe("B");
  });

  it("returns null after the draft is cleared", () => {
    saveConsultDraft("visit-1", { co: "fever", medicines: [] }, edits);
    clearConsultDraft("visit-1");
    expect(loadConsultDraft("visit-1")).toBeNull();
  });

  it("returns null for an unknown visit", () => {
    expect(loadConsultDraft("never-saved")).toBeNull();
  });

  it("ignores a draft written under a different version", () => {
    storage.setItem(
      "medireach:consult-draft:visit-1",
      JSON.stringify({ version: 999, savedAt: Date.now(), form: { co: "x", medicines: [] }, patientEdits: edits }),
    );
    expect(loadConsultDraft("visit-1")).toBeNull();
  });

  it("survives corrupt JSON without throwing", () => {
    storage.setItem("medireach:consult-draft:visit-1", "{ not json");
    expect(() => loadConsultDraft("visit-1")).not.toThrow();
    expect(loadConsultDraft("visit-1")).toBeNull();
  });
});
