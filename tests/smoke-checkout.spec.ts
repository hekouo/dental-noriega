import { test, expect } from "@playwright/test";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3002";

test.describe("Smoke Tests - Checkout Endpoints", () => {
  test("POST /api/checkout/create-order devuelve order_id y total_cents", async ({
    request,
  }) => {
    const response = await request.post(`${BASE_URL}/api/checkout/create-order`, {
      data: {
        items: [
          {
            id: "test-product-1",
            title: "Producto de Prueba",
            price: 100.0,
            qty: 2,
          },
        ],
        total_cents: 20000,
      },
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty("order_id");
    expect(data).toHaveProperty("total_cents");
    expect(typeof data.order_id).toBe("string");
    expect(data.total_cents).toBeGreaterThan(0);
    expect(data.order_id.length).toBeGreaterThan(0);
  });

  test("POST /api/stripe/create-payment-intent devuelve client_secret", async ({
    request,
  }) => {
    // Primero crear una orden
    const orderResponse = await request.post(`${BASE_URL}/api/checkout/create-order`, {
      data: {
        items: [
          {
            id: "test-product-1",
            title: "Producto de Prueba",
            price: 100.0,
            qty: 1,
          },
        ],
        total_cents: 10000,
      },
    });

    const orderData = await orderResponse.json();
    const orderId = orderData.order_id;

    if (!orderId) {
      test.skip();
      return;
    }

    // Luego crear payment intent
    const paymentResponse = await request.post(
      `${BASE_URL}/api/stripe/create-payment-intent`,
      {
        data: {
          order_id: orderId,
          total_cents: 10000,
        },
      },
    );

    // Puede fallar si Stripe no está configurado, pero debe devolver JSON válido
    expect([200, 500]).toContain(paymentResponse.status());
    const paymentData = await paymentResponse.json();

    if (paymentResponse.status() === 200) {
      expect(paymentData).toHaveProperty("client_secret");
      expect(typeof paymentData.client_secret).toBe("string");
      expect(paymentData.client_secret).toContain("pi_");
    } else {
      // Si falla, debe ser por configuración faltante
      expect(paymentData).toHaveProperty("error");
    }
  });

  test("POST /api/checkout/create-order valida items requeridos", async ({
    request,
  }) => {
    const response = await request.post(`${BASE_URL}/api/checkout/create-order`, {
      data: {
        items: [],
        total_cents: 0,
      },
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty("error");
  });
});

