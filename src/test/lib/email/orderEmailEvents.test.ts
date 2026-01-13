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
    let mockSupabase: {
      from: ReturnType<typeof vi.fn>;
      select: ReturnType<typeof vi.fn>;
      eq: ReturnType<typeof vi.fn>;
      single: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      // Crear mocks que retornan this para encadenar
      const fromMock = vi.fn();
      const selectMock = vi.fn();
      const eqForSelectMock = vi.fn();
      const singleMock = vi.fn();
      const updateMock = vi.fn();
      const eqForUpdateMock = vi.fn();

      fromMock.mockReturnValue({
        select: selectMock,
        update: updateMock,
      });
      selectMock.mockReturnValue({
        eq: eqForSelectMock,
      });
      eqForSelectMock.mockReturnValue({
        single: singleMock,
      });
      updateMock.mockReturnValue({
        eq: eqForUpdateMock,
      });

      mockSupabase = {
        from: fromMock,
        select: selectMock,
        eq: eqForSelectMock,
        single: singleMock,
        update: updateMock,
      };

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

      // Mock de la cadena update().eq()
      const eqAfterUpdate = vi.fn().mockResolvedValue({
        error: null,
      });
      mockSupabase.update.mockReturnValue({
        eq: eqAfterUpdate,
      } as any);

      const result = await markSent("test-order-id", "payment_confirmed_sent_at");

      expect(result).toBe(true);
      // Verificar que se llamó update con los datos correctos
      expect(mockSupabase.update).toHaveBeenCalled();
      const updateCall = mockSupabase.update.mock.calls[0][0];
      expect(updateCall.metadata.other_field).toBe("value");
      expect(updateCall.metadata.contact_email).toBe("test@example.com");
      expect(updateCall.metadata.email_events.payment_confirmed_sent_at).toBeDefined();
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

      // Mock de la cadena update().eq()
      const eqAfterUpdate = vi.fn().mockResolvedValue({
        error: null,
      });
      mockSupabase.update.mockReturnValue({
        eq: eqAfterUpdate,
      } as any);

      const result = await markSent("test-order-id", "payment_confirmed_sent_at");

      expect(result).toBe(true);
      // Verificar que se llamó update
      expect(mockSupabase.update).toHaveBeenCalled();
      const updateCall = mockSupabase.update.mock.calls[0][0];
      expect(updateCall.metadata.email_events.shipping_created_sent_at).toBe("2024-01-15T10:00:00Z");
      expect(updateCall.metadata.email_events.payment_confirmed_sent_at).toBeDefined();
    });

    it("debe retornar false si falla la actualización", async () => {
      mockSupabase.single.mockResolvedValue({
        data: { metadata: {} },
        error: null,
      });

      // Mock de la cadena update().eq() con error
      const eqAfterUpdate = vi.fn().mockResolvedValue({
        error: { message: "Update failed" },
      });
      mockSupabase.update.mockReturnValue({
        eq: eqAfterUpdate,
      } as any);

      const result = await markSent("test-order-id", "payment_confirmed_sent_at");
      expect(result).toBe(false);
    });
  });
});
