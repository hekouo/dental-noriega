import "@testing-library/jest-dom/vitest";
import * as React from "react";
import { vi } from "vitest";

// Mock unificado de next/image para evitar SSR behavior y loaders
// Usa React.createElement para evitar problemas con JSX en entorno de test
vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => {
    const { src, alt, width, height, ...rest } = props ?? {};
    const resolvedSrc = typeof src === "string" ? src : (src?.src ?? "");
    return React.createElement("img", {
      src: resolvedSrc || "/placeholder.png",
      alt: alt || "",
      width: width,
      height: height,
      loading: "lazy",
      decoding: "async",
      "data-testid": rest["data-testid"],
      ...rest,
    });
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
