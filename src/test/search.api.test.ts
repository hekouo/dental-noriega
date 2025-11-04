// src/test/search.api.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/products/search/route";
import { NextRequest } from "next/server";

// Mock getAllFromView
vi.mock("@/lib/catalog/getAllFromView.server", () => ({
  getAllFromView: vi.fn(() =>
    Promise.resolve([
      {
        id: "1",
        product_slug: "arco-niti-0-014",
        section: "ortodoncia_arcos_y_resortes",
        title: "Arco Niti 0.014",
        price: 150,
        price_cents: 15000,
        image_url: "https://example.com/arco.jpg",
      },
      {
        id: "2",
        product_slug: "bracket-ceramico-roth-azdent",
        section: "ortodoncia_brackets_y_tubos",
        title: "Bracket Cerámico Roth Azdent",
        price: 200,
        price_cents: 20000,
        image_url: "https://example.com/bracket.jpg",
      },
      {
        id: "3",
        product_slug: "aeropulidor",
        section: "equipos",
        title: "Aeropulidor Dental",
        price: 5000,
        price_cents: 500000,
        image_url: "https://example.com/aero.jpg",
      },
    ]),
  ),
}));

describe("GET /api/products/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("devuelve vacío si q está vacío", async () => {
    const req = new NextRequest("http://localhost/api/products/search?q=");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.items).toEqual([]);
    expect(data.total).toBe(0);
    expect(data.page).toBe(1);
    expect(data.perPage).toBe(20);
  });

  it("devuelve items cuando q='arco'", async () => {
    const req = new NextRequest(
      "http://localhost/api/products/search?q=arco&page=1",
    );
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.items.length).toBeGreaterThan(0);
    expect(data.items[0].title.toLowerCase()).toContain("arco");
    expect(data.total).toBeGreaterThan(0);
    expect(data.page).toBe(1);
    expect(data.perPage).toBe(20);
  });

  it("devuelve bracket-ceramico-roth-azdent cuando q='bracket roth'", async () => {
    const req = new NextRequest(
      "http://localhost/api/products/search?q=bracket%20roth&page=1",
    );
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.items.length).toBeGreaterThan(0);
    const bracket = data.items.find(
      (item: { product_slug: string }) =>
        item.product_slug === "bracket-ceramico-roth-azdent",
    );
    expect(bracket).toBeDefined();
  });

  it("pagina correctamente (perPage=20)", async () => {
    // Mock más items para probar paginación
    const { getAllFromView } = await import(
      "@/lib/catalog/getAllFromView.server"
    );
    vi.mocked(getAllFromView).mockResolvedValueOnce(
      Array.from({ length: 50 }, (_, i) => ({
        id: `id-${i}`,
        product_slug: `product-${i}`,
        section: "test",
        title: `Product ${i}`,
        price: 100,
        price_cents: 10000,
        image_url: null,
      })),
    );

    const req = new NextRequest(
      "http://localhost/api/products/search?q=product&page=1",
    );
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.items.length).toBe(20);
    expect(data.total).toBe(50);
    expect(data.page).toBe(1);
  });

  it("devuelve página 2 correctamente", async () => {
    const { getAllFromView } = await import(
      "@/lib/catalog/getAllFromView.server"
    );
    vi.mocked(getAllFromView).mockResolvedValueOnce(
      Array.from({ length: 50 }, (_, i) => ({
        id: `id-${i}`,
        product_slug: `product-${i}`,
        section: "test",
        title: `Product ${i}`,
        price: 100,
        price_cents: 10000,
        image_url: null,
      })),
    );

    const req = new NextRequest(
      "http://localhost/api/products/search?q=product&page=2",
    );
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.items.length).toBe(20);
    expect(data.page).toBe(2);
  });
});

