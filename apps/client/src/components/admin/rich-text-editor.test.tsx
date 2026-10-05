import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { RichTextEditor } from "./rich-text-editor";

describe("RichTextEditor", () => {
  it("mounts TipTap with the initial HTML and a labelled toolbar", async () => {
    render(<RichTextEditor label="النص (عربي)" value="<p>مرحبا</p>" onChange={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole("toolbar", { name: "أدوات النص (عربي)" })).toBeTruthy());
    expect(screen.getByText("مرحبا")).toBeTruthy();
    expect(screen.getByRole("button", { name: "عريض" })).toBeTruthy();
  });
});
