export function buildWaUrl({
  phone,
  text,
}: {
  phone: string;
  text: string;
}): string {
  const p = encodeURIComponent(phone.replace(/\D/g, ""));
  const t = encodeURIComponent(text);
  return "https://wa.me/" + p + "?text=" + t;
}

export function generateWhatsAppLink(phone: string, message?: string): string {
  const clean = phone.replace(/\D/g, "");
  if (!message) return "https://wa.me/" + encodeURIComponent(clean);
  return buildWaUrl({ phone: clean, text: message });
}

export function generateOrderWhatsAppMessage(
  orderNumber: string,
  total: number,
  method: "shipping" | "pickup",
): string {
  const methodLabel =
    method === "shipping" ? "Entrega a domicilio" : "Recoger en tienda";
  return (
    "Hola, necesito ayuda con mi pedido #" +
    orderNumber +
    ". Total: $" +
    total.toFixed(2) +
    " MXN. Método: " +
    methodLabel
  );
}
