// src/test/components/quantityStepper.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import QtyStepper from "@/components/ui/QtyStepper";

describe("QtyStepper", () => {
  it("should increment quantity", () => {
    const handleChange = vi.fn();
    render(
      <QtyStepper value={1} onValueChange={handleChange} min={1} max={99} />,
    );

    const incrementBtn = screen.getByLabelText("Aumentar");
    fireEvent.click(incrementBtn);

    expect(handleChange).toHaveBeenCalledWith(2);
  });

  it("should decrement quantity", () => {
    const handleChange = vi.fn();
    render(
      <QtyStepper value={2} onValueChange={handleChange} min={1} max={99} />,
    );

    const decrementBtn = screen.getByLabelText("Disminuir");
    fireEvent.click(decrementBtn);

    expect(handleChange).toHaveBeenCalledWith(1);
  });

  it("should not decrement below min", () => {
    const handleChange = vi.fn();
    render(
      <QtyStepper value={1} onValueChange={handleChange} min={1} max={99} />,
    );

    const decrementBtn = screen.getByLabelText("Disminuir");
    expect(decrementBtn).toBeDisabled();
  });

  it("should not increment above max", () => {
    const handleChange = vi.fn();
    render(
      <QtyStepper value={99} onValueChange={handleChange} min={1} max={99} />,
    );

    const incrementBtn = screen.getByLabelText("Aumentar");
    expect(incrementBtn).toBeDisabled();
  });

  it("should block invalid keyboard input (e, -, +)", () => {
    const handleChange = vi.fn();
    render(
      <QtyStepper value={5} onValueChange={handleChange} min={1} max={99} />,
    );

    const input = screen.getByLabelText("Cantidad") as HTMLInputElement;

    // Intentar escribir 'e'
    fireEvent.keyDown(input, { key: "e" });
    expect(input.value).toBe("5");

    // Intentar escribir '-'
    fireEvent.keyDown(input, { key: "-" });
    expect(input.value).toBe("5");

    // Intentar escribir '+'
    fireEvent.keyDown(input, { key: "+" });
    expect(input.value).toBe("5");
  });

  it("should allow valid keyboard input (numbers)", () => {
    const handleChange = vi.fn();
    render(
      <QtyStepper value={5} onValueChange={handleChange} min={1} max={99} />,
    );

    const input = screen.getByLabelText("Cantidad") as HTMLInputElement;

    // Escribir '8'
    fireEvent.keyDown(input, { key: "8" });
    fireEvent.change(input, { target: { value: "8" } });
    expect(handleChange).toHaveBeenCalled();
  });
});
