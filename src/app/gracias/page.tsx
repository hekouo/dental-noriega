export const revalidate = 0;

export default function GraciasPage() {
  return (
    <main className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">¡Gracias por tu compra!</h1>
      <p className="text-gray-600">
        Recibirás un correo con los detalles. Si tienes dudas, escríbenos por WhatsApp.
      </p>
      <a
        href={`https://wa.me/525531033715?text=${encodeURIComponent("Hola, tengo una duda sobre mi pedido.")}`}
        target="_blank" 
        rel="noopener noreferrer"
        className="bg-blue-600 text-white px-4 py-2 rounded-lg inline-block hover:bg-blue-700 transition"
      >
        Contactar por WhatsApp
      </a>
    </main>
  );
}

