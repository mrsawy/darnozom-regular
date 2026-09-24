import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import EditionBadge from "./edition-badge";

describe("EditionBadge", () => {
  it("labels a digital line and says how it is delivered", () => {
    render(<EditionBadge format="digital" lang="en" />);
    expect(screen.getByText("Digital edition")).toBeTruthy();
    expect(screen.getByText("Appears in My Library once payment is confirmed")).toBeTruthy();
  });

  it("labels a paper line in Arabic", () => {
    render(<EditionBadge format="paper" lang="ar" />);
    expect(screen.getByText("نسخة ورقية")).toBeTruthy();
    expect(screen.getByText("تُشحن إلى عنوانك")).toBeTruthy();
  });

  it("can hide the delivery hint", () => {
    render(<EditionBadge format="paper" lang="en" hint={false} />);
    expect(screen.getByText("Paper edition")).toBeTruthy();
    expect(screen.queryByText("Shipped to your address")).toBeNull();
  });

  it("renders nothing for an unknown format", () => {
    const { container } = render(<EditionBadge format={null} lang="en" />);
    expect(container.innerHTML).toBe("");
  });
});
