import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AvisoPrivacidadPage from "@/app/aviso-privacidad/page";
import TerminosCondicionesPage from "@/app/terminos-condiciones/page";

describe("Legal Pages", () => {
  it("should render aviso de privacidad page", () => {
    render(<AvisoPrivacidadPage />);
    expect(screen.getByText(/aviso de privacidad/i)).toBeInTheDocument();
    expect(screen.getByText(/responsable y contacto/i)).toBeInTheDocument();
    expect(screen.getByText(/datos recabados/i)).toBeInTheDocument();
    expect(screen.getByText(/derechos arco/i)).toBeInTheDocument();
  });

  it("should render términos y condiciones page", () => {
    render(<TerminosCondicionesPage />);
    expect(screen.getByText(/términos y condiciones/i)).toBeInTheDocument();
    expect(screen.getByText(/objeto del sitio/i)).toBeInTheDocument();
    expect(screen.getByText(/precios/i)).toBeInTheDocument();
    expect(screen.getByText(/garantías y devoluciones/i)).toBeInTheDocument();
  });

  it("should contain company information in aviso", () => {
    render(<AvisoPrivacidadPage />);
    const companyMentions = screen.getAllByText(/depósito dental noriega/i);
    expect(companyMentions.length).toBeGreaterThan(0);
  });

  it("should contain company information in términos", () => {
    render(<TerminosCondicionesPage />);
    const companyMentions = screen.getAllByText(/depósito dental noriega/i);
    expect(companyMentions.length).toBeGreaterThan(0);
  });

  it("should have back to home link in aviso", () => {
    render(<AvisoPrivacidadPage />);
    expect(screen.getByText(/volver al inicio/i)).toBeInTheDocument();
  });

  it("should have back to home link in términos", () => {
    render(<TerminosCondicionesPage />);
    expect(screen.getByText(/volver al inicio/i)).toBeInTheDocument();
  });
});
