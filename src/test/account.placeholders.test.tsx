import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PedidosPage from "@/app/cuenta/pedidos/page";
import MetodosPage from "@/app/cuenta/metodos/page";
import DireccionesPage from "@/app/cuenta/direcciones/page";

describe("Account Placeholder Pages", () => {
  it("should render pedidos placeholder page", () => {
    render(<PedidosPage />);
    expect(screen.getByText(/mis pedidos/i)).toBeInTheDocument();
    expect(screen.getByText(/próximamente disponible/i)).toBeInTheDocument();
    expect(screen.getByText(/volver al inicio/i)).toBeInTheDocument();
    expect(screen.getByText(/ir al catálogo/i)).toBeInTheDocument();
  });

  it("should render metodos placeholder page", () => {
    render(<MetodosPage />);
    expect(screen.getByText(/métodos de pago/i)).toBeInTheDocument();
    expect(screen.getByText(/próximamente disponible/i)).toBeInTheDocument();
    expect(screen.getByText(/volver al inicio/i)).toBeInTheDocument();
    expect(screen.getByText(/ir al catálogo/i)).toBeInTheDocument();
  });

  it("should render direcciones placeholder page", () => {
    render(<DireccionesPage />);
    expect(screen.getByText(/mis direcciones/i)).toBeInTheDocument();
    expect(screen.getByText(/próximamente disponible/i)).toBeInTheDocument();
    expect(screen.getByText(/volver al inicio/i)).toBeInTheDocument();
    expect(screen.getByText(/ir al catálogo/i)).toBeInTheDocument();
  });

  it("should never show 404 on account pages", () => {
    const { container: pedidosContainer } = render(<PedidosPage />);
    expect(pedidosContainer.querySelector("main")).toBeInTheDocument();
    expect(screen.queryByText(/404/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/not found/i)).not.toBeInTheDocument();
  });

  it("should never show 404 on metodos page", () => {
    const { container: metodosContainer } = render(<MetodosPage />);
    expect(metodosContainer.querySelector("main")).toBeInTheDocument();
    expect(screen.queryByText(/404/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/not found/i)).not.toBeInTheDocument();
  });

  it("should never show 404 on direcciones page", () => {
    const { container: direccionesContainer } = render(<DireccionesPage />);
    expect(direccionesContainer.querySelector("main")).toBeInTheDocument();
    expect(screen.queryByText(/404/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/not found/i)).not.toBeInTheDocument();
  });
});
