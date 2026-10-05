import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";

vi.mock("@/components/admin/rich-text-editor", () => ({
  RichTextEditor: ({ label, value, onChange }: any) => <textarea aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} />,
}));
vi.mock("@/pages/admin/_image-upload", () => ({ ImageUploadField: () => null }));
vi.mock("@/components/admin/file-upload-field", () => ({ FileUploadField: () => null }));

import AdminContentEditor from "./content-editor";

function setup(type: string, fetchImpl: (url: string, init?: RequestInit) => Promise<Response>) {
  const fetchMock = vi.fn(fetchImpl);
  vi.stubGlobal("fetch", fetchMock);
  const loc = memoryLocation({ path: `/admin/content/${type}/new`, record: true });
  render(<Router hook={loc.hook}><AdminContentEditor type={type as any} id="new" /></Router>);
  return { fetchMock, loc };
}

afterEach(() => vi.unstubAllGlobals());

describe("AdminContentEditor", () => {
  it("shows observatory-specific fields", () => {
    setup("observatory", async () => new Response("{}"));
    expect(screen.getByLabelText("نوع المادة")).toBeTruthy();
    expect(screen.getByLabelText("ما الذي حدث؟ (عربي)")).toBeTruthy();
    expect(screen.getByText("المصادر")).toBeTruthy();
    expect(screen.queryByLabelText("رقم العدد")).toBeNull();
  });

  it("shows event fields and posts the full payload", async () => {
    const { fetchMock, loc } = setup("event", async () => new Response(JSON.stringify({ id: 42 }), { status: 201 }));
    fireEvent.change(screen.getByLabelText("العنوان (عربي)"), { target: { value: "ندوة" } });
    fireEvent.change(screen.getByLabelText("نوع الفعالية"), { target: { value: "seminar" } });
    fireEvent.change(screen.getByLabelText("الحالة"), { target: { value: "published" } });
    fireEvent.click(screen.getByRole("button", { name: "حفظ" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/admin/cms/items");
    const body = JSON.parse(String(init!.body));
    expect(body).toMatchObject({ type: "event", titleAr: "ندوة", status: "published", details: { kind: "seminar", registration: "interest" } });
    await waitFor(() => expect(loc.history!.at(-1)).toBe("/admin/content/event/42"));
  });

  it("shows server validation issues", async () => {
    setup("publication", async () =>
      new Response(JSON.stringify({ error: "Invalid content", issues: [{ path: ["details", "kind"], message: "Required" }] }), { status: 400 }),
    );
    fireEvent.change(screen.getByLabelText("العنوان (عربي)"), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: "حفظ" }));
    expect(await screen.findByText("details.kind: Required")).toBeTruthy();
  });
});
