import { vi, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});

// jsdom doesn't provide a fully functional localStorage, so we provide a mock
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, "localStorage", {
  value: localStorageMock,
});

// jsdom doesn't implement IntersectionObserver, which framer-motion's
// `whileInView` (used throughout the store pages) relies on.
class IntersectionObserverMock {
  readonly root = null;
  readonly rootMargin = "";
  readonly thresholds: number[] = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

Object.defineProperty(global, "IntersectionObserver", {
  writable: true,
  configurable: true,
  value: IntersectionObserverMock,
});
