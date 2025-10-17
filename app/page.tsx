import FeaturedCarousel from "../components/FeaturedCarousel";

export default function Home() {
  return (
    <>
      <section className="container mx-auto px-4">
        <h2 className="text-xl font-semibold mb-2">Destacados</h2>
        <FeaturedCarousel />
      </section>
    </>
  );
}
