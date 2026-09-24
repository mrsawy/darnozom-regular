import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import MyLibrary from "./my-library";

function mockLibrary(body: unknown, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(body), { status })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const available = {
  key: "var_d",
  title: "Digital Transformation",
  imageUrl: null,
  orderId: 7,
  status: "available",
  files: [
    { id: "f1", title: "Full book", fileName: "book.pdf", kind: "pdf", size: 2048, url: "/api/account/me/library/files/f1" },
    { id: "f2", title: "Chapter 1", fileName: "ch1.mp3", kind: "audio", size: 1024, url: "/api/account/me/library/files/f2" },
    { id: "f3", title: "Workbook", fileName: "work.zip", kind: "other", size: 10, url: "/api/account/me/library/files/f3" },
  ],
};

describe("MyLibrary", () => {
  it("loads the library from the account endpoint", async () => {
    mockLibrary({ books: [] });
    render(<MyLibrary lang="en" />);
    await screen.findByTestId("library-empty");
    expect((fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0]).toBe(
      "/api/account/me/library",
    );
  });

  it("lists each file with read / listen / download actions by type", async () => {
    mockLibrary({ books: [available] });
    render(<MyLibrary lang="en" />);
    expect(await screen.findByText("Digital Transformation")).toBeTruthy();

    const read = screen.getByTestId("library-read-f1");
    expect(read.getAttribute("href")).toBe("/api/account/me/library/files/f1");
    expect(read.getAttribute("target")).toBe("_blank");
    expect(screen.getByTestId("library-download-f1").getAttribute("href")).toBe(
      "/api/account/me/library/files/f1?download=1",
    );

    const audio = screen.getByTestId("library-audio-f2");
    expect(audio.getAttribute("src")).toBe("/api/account/me/library/files/f2");

    expect(screen.queryByTestId("library-read-f3")).toBeNull();
    expect(screen.getByTestId("library-download-f3").getAttribute("href")).toBe(
      "/api/account/me/library/files/f3?download=1",
    );
  });

  it("shows awaiting-payment books without files", async () => {
    mockLibrary({ books: [{ ...available, status: "awaiting_payment", files: [] }] });
    render(<MyLibrary lang="en" />);
    expect(await screen.findByTestId("library-awaiting-var_d")).toBeTruthy();
    expect(screen.queryByTestId("library-read-f1")).toBeNull();
  });

  it("explains when a paid book has no files yet or files are unavailable", async () => {
    mockLibrary({
      books: [
        { ...available, key: "a", files: [] },
        { ...available, key: "b", files: [], filesUnavailable: true },
      ],
    });
    render(<MyLibrary lang="en" />);
    expect(await screen.findByTestId("library-nofiles-a")).toBeTruthy();
    expect(screen.getByTestId("library-unavailable-b")).toBeTruthy();
  });

  it("shows an error when the library cannot be loaded", async () => {
    mockLibrary({ error: "boom" }, 500);
    render(<MyLibrary lang="en" />);
    expect(await screen.findByTestId("library-error")).toBeTruthy();
  });
});
