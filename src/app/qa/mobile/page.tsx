// src/app/qa/mobile/page.tsx
export const revalidate = 0;

const checks = [
  "Header no tapa contenido",
  "Burbujas visibles y no tapan footer",
  "Cards legibles en 1c/2c",
  "Imágenes sin salto o estiramiento",
  "Drawer bloquea scroll y cierra con Escape",
  "Botones y links ≥ 44px",
  "Inputs muestran teclado correcto",
  "Sin zoom involuntario en iOS (fuente ≥ 16px)",
  "Safe area respetada en notch/home indicator",
  "Buscador funcional en móvil",
];

export default function QAMobile() {
  return (
    <main className="max-w-3xl mx-auto p-4 space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6 border">
        <h1 className="text-2xl font-semibold mb-4">QA Móvil - Checklist</h1>
        <p className="text-gray-600 mb-6">
          Verifica estos puntos en un dispositivo móvil real o con DevTools
          (Ctrl+Shift+M).
        </p>

        <ol className="list-decimal pl-6 space-y-3">
          {checks.map((c) => (
            <li key={c} className="text-gray-700">
              <span className="font-medium">{c}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 border">
        <h2 className="text-xl font-semibold mb-4">Vista Previa</h2>
        <p className="text-sm text-gray-600 mb-4">
          Simulación de pantallas (mejor abrir cada URL en DevTools móvil).
        </p>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded-lg overflow-hidden">
            <iframe title="Home" src="/" className="w-full h-[640px]" />
            <p className="text-xs text-center text-gray-500 p-2">Home</p>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <iframe
              title="Catálogo"
              src="/catalogo"
              className="w-full h-[640px]"
            />
            <p className="text-xs text-center text-gray-500 p-2">Catálogo</p>
          </div>
        </section>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">💡 Tip de prueba</h3>
        <p className="text-sm text-blue-800">
          Abre DevTools → Ctrl+Shift+M → Selecciona iPhone 12/13 Pro → Navega
          por el sitio.
        </p>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="font-semibold text-green-900 mb-2">🚀 Lighthouse</h3>
        <p className="text-sm text-green-800 mb-2">Para auditoría completa:</p>
        <pre className="bg-white p-3 rounded text-xs overflow-x-auto">
          npm run lh:mobile
        </pre>
        <p className="text-xs text-green-700 mt-2">
          Target: Performance ≥ 90, Accessibility ≥ 90, SEO ≥ 90, Best Practices
          ≥ 90
        </p>
      </div>
    </main>
  );
}
