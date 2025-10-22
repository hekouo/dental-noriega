export function generateWhatsAppLink(phone: string, message?: string): string {
  const cleanPhone = phone.replace(/\D/g, "");
  const encodedMessage = message ? encodeURIComponent(message) : "";
  return `https://wa.me/${cleanPhone}${encodedMessage ? `?text=${encodedMessage}` : ""}`;
}

export function generateOrderWhatsAppMessage(
  orderNumber: string,
  total: number,
  method: "shipping" | "pickup",
): string {
  return `Hola, necesito ayuda con mi pedido #${orderNumber}. Total: $${total.toFixed(2)} MXN. Método: ${
    method === "shipping" ? "Entrega a domicilio" : "Recoger en tienda"
  }`;
}
