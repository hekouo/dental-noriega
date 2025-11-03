// src/test/checkout.datos.form.test.tsx
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import DatosPageClient from "@/app/checkout/datos/ClientPage";
import { useCheckoutStore } from "@/lib/store/checkoutStore";
import { useSelectedIds } from "@/lib/store/checkoutSelectors";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

vi.mock("@/lib/store/checkoutStore", () => ({
  useCheckoutStore: vi.fn(),
}));

vi.mock("@/lib/store/checkoutSelectors", () => ({
  useSelectedIds: vi.fn(),
}));

describe("DatosPageClient form", () => {
  const mockPush = vi.fn();
  const mockSetDatos = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useRouter as any).mockReturnValue({
      push: mockPush,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useCheckoutStore as any).mockReturnValue({
      setDatos: mockSetDatos,
      datos: null,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useSelectedIds as any).mockReturnValue(["product-1", "product-2"]);
  });

  it("should render form with all required fields", () => {
    render(<DatosPageClient />);

    expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/apellido/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/teléfono/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/dirección/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/colonia/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/ciudad/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/estado/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/código postal/i)).toBeInTheDocument();
  });

  it("should disable submit button until form is valid", () => {
    render(<DatosPageClient />);

    const submitButton = screen.getByRole("button", {
      name: /guardar y continuar/i,
    });
    expect(submitButton).toBeDisabled();
  });

  it("should enable submit button when form is valid", async () => {
    render(<DatosPageClient />);

    const nameInput = screen.getByLabelText(/nombre/i);
    const lastnameInput = screen.getByLabelText(/apellido/i);
    const emailInput = screen.getByLabelText(/correo electrónico/i);
    const phoneInput = screen.getByLabelText(/teléfono/i);
    const addressInput = screen.getByLabelText(/dirección/i);
    const neighborhoodInput = screen.getByLabelText(/colonia/i);
    const cityInput = screen.getByLabelText(/ciudad/i);
    const stateSelect = screen.getByLabelText(/estado/i);
    const cpInput = screen.getByLabelText(/código postal/i);
    const aceptaAvisoCheckbox = screen.getByLabelText(/acepto el/i);

    // Fill form
    fireEvent.change(nameInput, { target: { value: "Juan" } });
    fireEvent.change(lastnameInput, { target: { value: "Pérez" } });
    fireEvent.change(emailInput, { target: { value: "juan@example.com" } });
    fireEvent.change(phoneInput, { target: { value: "5512345678" } });
    fireEvent.change(addressInput, {
      target: { value: "Calle Principal 123" },
    });
    fireEvent.change(neighborhoodInput, { target: { value: "Centro" } });
    fireEvent.change(cityInput, { target: { value: "Ciudad de México" } });
    fireEvent.change(stateSelect, { target: { value: "Ciudad de México" } });
    fireEvent.change(cpInput, { target: { value: "12345" } });
    fireEvent.click(aceptaAvisoCheckbox);

    const submitButton = screen.getByRole("button", {
      name: /guardar y continuar/i,
    });
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });

  it("should call setDatos and navigate to /checkout/pago on valid submit", async () => {
    render(<DatosPageClient />);

    const nameInput = screen.getByLabelText(/nombre/i);
    const lastnameInput = screen.getByLabelText(/apellido/i);
    const emailInput = screen.getByLabelText(/correo electrónico/i);
    const phoneInput = screen.getByLabelText(/teléfono/i);
    const addressInput = screen.getByLabelText(/dirección/i);
    const neighborhoodInput = screen.getByLabelText(/colonia/i);
    const cityInput = screen.getByLabelText(/ciudad/i);
    const stateSelect = screen.getByLabelText(/estado/i);
    const cpInput = screen.getByLabelText(/código postal/i);
    const aceptaAvisoCheckbox = screen.getByLabelText(/acepto el/i);

    // Fill form
    fireEvent.change(nameInput, { target: { value: "Juan" } });
    fireEvent.change(lastnameInput, { target: { value: "Pérez" } });
    fireEvent.change(emailInput, { target: { value: "juan@example.com" } });
    fireEvent.change(phoneInput, { target: { value: "5512345678" } });
    fireEvent.change(addressInput, {
      target: { value: "Calle Principal 123" },
    });
    fireEvent.change(neighborhoodInput, { target: { value: "Centro" } });
    fireEvent.change(cityInput, { target: { value: "Ciudad de México" } });
    fireEvent.change(stateSelect, { target: { value: "Ciudad de México" } });
    fireEvent.change(cpInput, { target: { value: "12345" } });
    fireEvent.click(aceptaAvisoCheckbox);

    const submitButton = screen.getByRole("button", {
      name: /guardar y continuar/i,
    });
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSetDatos).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Juan",
          last_name: "Pérez",
          email: "juan@example.com",
          phone: "5512345678",
          address: "Calle Principal 123",
          neighborhood: "Centro",
          city: "Ciudad de México",
          state: "Ciudad de México",
          cp: "12345",
          aceptaAviso: true,
        }),
      );
      expect(mockPush).toHaveBeenCalledWith("/checkout/pago");
    });
  });

  it("should show error for invalid phone (less than 10 digits)", async () => {
    render(<DatosPageClient />);

    const phoneInput = screen.getByLabelText(/teléfono/i);
    fireEvent.change(phoneInput, { target: { value: "12345" } });
    fireEvent.blur(phoneInput);

    await waitFor(() => {
      expect(screen.getByText(/teléfono inválido/i)).toBeInTheDocument();
    });
  });

  it("should show error for invalid CP (less than 5 digits)", async () => {
    render(<DatosPageClient />);

    const cpInput = screen.getByLabelText(/código postal/i);
    fireEvent.change(cpInput, { target: { value: "123" } });
    fireEvent.blur(cpInput);

    await waitFor(() => {
      expect(screen.getByText(/código postal inválido/i)).toBeInTheDocument();
    });
  });

  it("should block invalid keyboard input in phone field (e, -, +)", () => {
    render(<DatosPageClient />);

    const phoneInput = screen.getByLabelText(/teléfono/i) as HTMLInputElement;

    // Try to type invalid characters
    fireEvent.keyDown(phoneInput, { key: "e" });
    fireEvent.keyDown(phoneInput, { key: "-" });
    fireEvent.keyDown(phoneInput, { key: "+" });
    fireEvent.keyDown(phoneInput, { key: "." });

    // Should allow numbers
    fireEvent.change(phoneInput, { target: { value: "5512345678" } });
    expect(phoneInput.value).toBe("5512345678");
  });
});
