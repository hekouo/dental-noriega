import { ProductCard } from "@/components/ProductCard";
import { readCSV } from "@/lib/utils/csv";
import { parsePrice } from "@/lib/utils/catalog";

export const revalidate = 300; // Cache 5 minutos

export default async function DestacadosPage() {
  // Read CSV file from public/data
  const products = await readCSV("/data/destacados_sin_descuento.csv");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-2">Productos Destacados</h1>
          <p className="text-primary-100">
            Los mejores productos para tu consultorio dental
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product: any, index: number) => {
            // Usar las columnas correctas del CSV
            const sku = product.sku || `dest-${index}`;
            const name = product.product_name || "";
            const price = parsePrice(product.price_mxn);
            const description =
              [product.variant, product.package, product.brand]
                .filter(Boolean)
                .join(" • ") || "";
            const image = product.image || "";

            return (
              <ProductCard
                key={sku}
                sku={sku}
                name={name}
                price={price}
                description={description}
                image={image}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
