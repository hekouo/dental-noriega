import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Devoluciones',
  description: 'Política de devoluciones y cambios de DENTAL NORIEGA'
};

export default function DevolucionesPage() {
  return (
    <div className="max-w-4xl mx-auto py-12">
      <h1 className="text-3xl font-bold mb-6">Política de Devoluciones y Cambios</h1>
      
      <div className="prose prose-gray max-w-none">
        <h2 className="text-xl font-semibold mt-6 mb-3">Condiciones generales</h2>
        <p className="mb-4">
          Aceptamos devoluciones y cambios dentro de los primeros 7 días después de recibir tu pedido,
          siempre y cuando el producto esté en su empaque original y sin usar.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-3">Productos no reembolsables</h2>
        <ul className="list-disc pl-6 mb-4">
          <li>Productos que hayan sido abiertos o utilizados</li>
          <li>Artículos personalizados o de pedido especial</li>
          <li>Productos sin empaque original o etiquetas</li>
        </ul>

        <h2 className="text-xl font-semibold mt-6 mb-3">Proceso de devolución</h2>
        <ol className="list-decimal pl-6 mb-4">
          <li>Contacta con nosotros por WhatsApp indicando tu número de pedido</li>
          <li>Espera la confirmación y las instrucciones de devolución</li>
          <li>Envía el producto de vuelta en su empaque original</li>
          <li>Una vez recibido y revisado, procesaremos tu reembolso o cambio</li>
        </ol>

        <h2 className="text-xl font-semibold mt-6 mb-3">Contacto</h2>
        <p className="mb-4">
          Para iniciar una devolución o cambio, contáctanos por WhatsApp al{' '}
          <a href="https://wa.me/525531033715" className="text-blue-600 hover:underline">
            +52 55 3103 3715
          </a>
        </p>
      </div>
    </div>
  );
}

