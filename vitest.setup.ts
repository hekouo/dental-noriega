import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Mock de next/image para evitar SSR behavior y loaders
vi.mock("next/image", () => {
  // eslint-disable-next-line react/display-name
  return {
    default: ({ src, alt, ...props }: any) => {
      // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
      return <img src={typeof src === "string" ? src : src?.src ?? ""} alt={alt} {...props} />;
    },
  };
});

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

