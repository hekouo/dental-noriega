import { FeedbackForm } from "@/components/feedback/FeedbackForm.client";

export const metadata = {
  title: "Opiniones",
  description: "Envíanos tu opinión o sugerencia sobre el sitio.",
};

export default function OpinionesPage() {
  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-semibold text-stone-900 dark:text-white mb-2">
        Opiniones
      </h1>
      <p className="text-stone-600 dark:text-stone-400 mb-6">
        Tu opinión nos ayuda a mejorar. Cuéntanos qué piensas o reporta un problema.
      </p>
      <FeedbackForm defaultPagePath="/opiniones" />
    </div>
  );
}
