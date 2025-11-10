import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import QuantityInput from "@/components/cart/QuantityInput";

describe("QuantityInput", () => {
  it("renders with initial value", () => {
    const onChange = vi.fn();
    render(<QuantityInput value={5} onChange={onChange} />);
    const input = screen.getByLabelText("Cantidad");
    expect(input).toHaveValue(5);
  });

  it("calls onChange when incrementing", () => {
    const onChange = vi.fn();
    render(<QuantityInput value={1} onChange={onChange} />);
    const incrementBtn = screen.getByLabelText("Aumentar cantidad");
    fireEvent.click(incrementBtn);
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it("calls onChange when decrementing", () => {
    const onChange = vi.fn();
    render(<QuantityInput value={5} onChange={onChange} />);
    const decrementBtn = screen.getByLabelText("Disminuir cantidad");
    fireEvent.click(decrementBtn);
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it("respects min value", () => {
    const onChange = vi.fn();
    render(<QuantityInput value={1} onChange={onChange} min={1} />);
    const decrementBtn = screen.getByLabelText("Disminuir cantidad");
    expect(decrementBtn).toBeDisabled();
    fireEvent.click(decrementBtn);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("respects max value", () => {
    const onChange = vi.fn();
    render(<QuantityInput value={999} onChange={onChange} max={999} />);
    const incrementBtn = screen.getByLabelText("Aumentar cantidad");
    expect(incrementBtn).toBeDisabled();
    fireEvent.click(incrementBtn);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("handles ArrowUp key", () => {
    const onChange = vi.fn();
    render(<QuantityInput value={5} onChange={onChange} />);
    const input = screen.getByLabelText("Cantidad");
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(onChange).toHaveBeenCalledWith(6);
  });

  it("handles ArrowDown key", () => {
    const onChange = vi.fn();
    render(<QuantityInput value={5} onChange={onChange} />);
    const input = screen.getByLabelText("Cantidad");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it("handles input change", () => {
    const onChange = vi.fn();
    render(<QuantityInput value={1} onChange={onChange} />);
    const input = screen.getByLabelText("Cantidad") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "10" } });
    expect(onChange).toHaveBeenCalledWith(10);
  });

  it("clamps values to min/max", () => {
    const onChange = vi.fn();
    render(<QuantityInput value={1} onChange={onChange} min={1} max={99} />);
    const input = screen.getByLabelText("Cantidad") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "999" } });
    expect(onChange).toHaveBeenCalledWith(99);
  });
});

