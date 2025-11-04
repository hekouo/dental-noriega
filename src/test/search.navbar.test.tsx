// src/test/search.navbar.test.tsx
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import NavbarSearch from "@/components/NavbarSearch";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe("NavbarSearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render search input and button", () => {
    render(<NavbarSearch />);
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /buscar/i })).toBeInTheDocument();
  });

  it("should navigate to /buscar?q=... when Enter is pressed", async () => {
    render(<NavbarSearch />);
    const input = screen.getByRole("searchbox") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "arco" } });
    await new Promise((r) => setTimeout(r, 350)); // esperar debounce

    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    expect(mockPush).toHaveBeenCalledWith("/buscar?q=arco");
  });

  it("should navigate to /buscar?q=... when button is clicked", async () => {
    render(<NavbarSearch />);
    const input = screen.getByRole("searchbox") as HTMLInputElement;
    const button = screen.getByRole("button", { name: /buscar/i });

    fireEvent.change(input, { target: { value: "bracket" } });
    await new Promise((r) => setTimeout(r, 350)); // esperar debounce

    fireEvent.click(button);

    expect(mockPush).toHaveBeenCalledWith("/buscar?q=bracket");
  });

  it("should enable button after debounce when typing", async () => {
    render(<NavbarSearch />);
    const input = screen.getByRole("searchbox") as HTMLInputElement;
    const button = screen.getByRole("button", { name: /buscar/i });

    expect(button).toBeDisabled();

    fireEvent.change(input, { target: { value: "test" } });
    await new Promise((r) => setTimeout(r, 350));

    expect(button).not.toBeDisabled();
  });
});

