import { redirect } from "next/navigation";
import QuizClient from "./QuizClient";

export const dynamic = "force-dynamic";

/**
 * Página del quiz/recomendador de productos
 * Solo accesible si NEXT_PUBLIC_ENABLE_QUIZ === "true"
 */
export default function QuizPage() {
  const isEnabled = process.env.NEXT_PUBLIC_ENABLE_QUIZ === "true";

  if (!isEnabled) {
    redirect("/buscar");
  }

  return <QuizClient />;
}
