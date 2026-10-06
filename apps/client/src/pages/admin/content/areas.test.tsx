import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import AdminContentAreas from "./areas";

const rows = [
  { id: 1, slug: "a", labelAr: "مجال أ", labelEn: "A", position: 0, isActive: true },
  { id: 2, slug: "b", labelAr: "مجال ب", labelEn: "B", position: 1, isActive: false },
];

function setup() {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === "POST") return new Response(JSON.stringify({ id: 3 }), { status: 201 });
    if (init?.method === "PUT") return new Response(JSON.stringify({}), { status: 200 });
    return new Response(JSON.stringify(rows));
  });
  vi.stubGlobal("fetch", fetchMock);
  render(<AdminContentAreas />);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe("AdminContentAreas", () => {
  it("lists areas from the API and marks inactive ones", async () => {
    setup();
    expect(await screen.findByText("مجال أ")).toBeTruthy();
    expect(screen.getByText(/معطّل/)).toBeTruthy();
  });

  it("creates a new area", async () => {
    const fetchMock = setup();
    await screen.findByText("مجال أ");
    fireEvent.click(screen.getByText("مجال جديد"));
    fireEvent.change(screen.getByLabelText("الاسم بالعربية"), { target: { value: "جديد" } });
    fireEvent.change(screen.getByLabelText("المعرّف"), { target: { value: "new_area" } });
    fireEvent.click(screen.getByText("حفظ"));
    await waitFor(() => {
      const post = fetchMock.mock.calls.find(([, i]) => i?.method === "POST");
      expect(JSON.parse(post![1]!.body as string)).toMatchObject({ slug: "new_area", labelAr: "جديد", isActive: true });
    });
  });

  it("reorders via the move buttons", async () => {
    const fetchMock = setup();
    await screen.findByText("مجال أ");
    fireEvent.click(screen.getAllByLabelText("تحريك لأسفل")[0]);
    await waitFor(() => {
      const put = fetchMock.mock.calls.find(([u]) => String(u).endsWith("/order"));
      expect(JSON.parse(put![1]!.body as string)).toEqual({ ids: [2, 1] });
    });
  });
});
