import "@testing-library/jest-dom/vitest";
import React from "react";
import { vi } from "vitest";

// Mock de next/image para evitar SSR behavior y loaders
vi.mock("next/image", () => ({
  default: (props: any) => {
    const { src, alt, ...rest } = props ?? {};
    const resolved =
      typeof src === "string" ? src : (src?.src ?? "");
    return React.createElement("img", { src: resolved, alt, ...rest });
  },
}));

// Mocks defensivos de next/navigation si algún test lo toca
vi.mock("next/navigation", () => {
  return {
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
    }),
    useSearchParams: () => new URLSearchParams(),
  };
});

