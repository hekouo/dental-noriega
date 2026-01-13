import { describe, it, expect, beforeEach, vi } from "vitest";
import { shouldSend, markSent, type EmailEventKey } from "@/lib/email/orderEmailEvents";
import { createClient } from "@supabase/supabase-js";

// Mock de Supabase
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}));

describe("orderEmailEvents", () => {
  describe("shouldSend", () => {
    it("debe retornar true si no hay metadata", () => {
      expect(shouldSend(null, "payment_confirmed_sent_at")).toBe(true);
      expect(shouldSend(undefined, "payment_confirmed_sent_at")).toBe(true);
    });

    it("debe retornar true si no hay email_events", () => {
      const metadata = { other_field: "value" };
      expect(shouldSend(metadata, "payment_confirmed_sent_at")).toBe(true);
    });

    it("debe retornar true si email_events está vacío", () => {
      const metadata = { email_events: {} };
      expect(shouldSend(metadata, "payment_confirmed_sent_at")).toBe(true);
    });

    it("debe retornar false si ya se envió el evento", () => {
      const metadata = {
        email_events: {
          payment_confirmed_sent_at: "2024-01-15T10:00:00Z",
        },
      };
      expect(shouldSend(metadata, "payment_confirmed_sent_at")).toBe(false);
    });

    it("debe retornar true si se envió otro evento pero no este", () => {
      const metadata = {
        email_events: {
          shipping_created_sent_at: "2024-01-15T10:00:00Z",
        },
      };
      expect(shouldSend(metadata, "payment_confirmed_sent_at")).toBe(true);
    });

    it("debe funcionar con todos los tipos de eventos", () => {
      const metadata = {
        email_events: {
          payment_confirmed_sent_at: "2024-01-15T10:00:00Z",
          shipping_created_sent_at: "2024-01-15T11:00:00Z",
          delivered_sent_at: "2024-01-15T12:00:00Z",
          needs_address_review_sent_at: "2024-01-15T13:00:00Z",
        },
      };

      expect(shouldSend(metadata, "payment_confirmed_sent_at")).toBe(false);
      expect(shouldSend(metadata, "shipping_created_sent_at")).toBe(false);
      expect(shouldSend(metadata, "delivered_sent_at")).toBe(false);
      expect(shouldSend(metadata, "needs_address_review_sent_at")).toBe(false);
    });
  });

  describe("markSent", () => {
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      update: vi.fn().mockReturnThis(),
    };

    beforeEach(() => {
      vi.clearAllMocks();
      vi.mocked(createClient).mockReturnValue(mockSupabase as any);
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
    });

    it("debe retornar false si Supabase no está configurado", async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      const result = await markSent("test-order-id", "payment_confirmed_sent_at");
      expect(result).toBe(false);
    });

    it("debe retornar false si la orden no existe", async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: "Not found" },
      });

      const result = await markSent("test-order-id", "payment_confirmed_sent_at");
      expect(result).toBe(false);
    });

    it("debe hacer merge seguro de metadata al marcar como enviado", async () => {
      const existingMetadata = {
        other_field: "value",
        contact_email: "test@example.com",
      };

      mockSupabase.single.mockResolvedValue({
        data: { metadata: existingMetadata },
        error: null,
      });

      mockSupabase.eq.mockResolvedValue({
        error: null,
      });

      const result = await markSent("test-order-id", "payment_confirmed_sent_at");

      expect(result).toBe(true);
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            other_field: "value",
            contact_email: "test@example.com",
            email_events: expect.objectContaining({
              payment_confirmed_sent_at: expect.any(String),
            }),
          }),
        }),
      );
    });

    it("debe preservar email_events existentes al agregar uno nuevo", async () => {
      const existingMetadata = {
        email_events: {
          shipping_created_sent_at: "2024-01-15T10:00:00Z",
        },
      };

      mockSupabase.single.mockResolvedValue({
        data: { metadata: existingMetadata },
        error: null,
      });

      mockSupabase.eq.mockResolvedValue({
        error: null,
      });

      const result = await markSent("test-order-id", "payment_confirmed_sent_at");

      expect(result).toBe(true);
      const updateCall = mockSupabase.update.mock.calls[0][0];
      expect(updateCall.metadata.email_events.shipping_created_sent_at).toBe("2024-01-15T10:00:00Z");
      expect(updateCall.metadata.email_events.payment_confirmed_sent_at).toBeDefined();
    });

    it("debe retornar false si falla la actualización", async () => {
      mockSupabase.single.mockResolvedValue({
        data: { metadata: {} },
        error: null,
      });

      mockSupabase.eq.mockResolvedValue({
        error: { message: "Update failed" },
      });

      const result = await markSent("test-order-id", "payment_confirmed_sent_at");
      expect(result).toBe(false);
    });
  });
});
