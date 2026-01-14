"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Sparkles } from "lucide-react";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";

const QUIZ_STORAGE_KEY = "ddn_quiz_v1";

type QuizAnswer = string | null;

type QuizState = {
  step: number;
  answers: {
    category?: QuizAnswer;
    priority?: QuizAnswer;
    usage?: QuizAnswer;
    budget?: QuizAnswer;
  };
};

type CategoryOption = {
  value: string;
  label: string;
  searchQuery?: string;
  sectionSlug?: string;
};

type PriorityOption = {
  value: string;
  label: string;
  sort: string;
};

type UsageOption = {
  value: string;
  label: string;
  searchQuery?: string;
  priceRange?: string;
};

const TOTAL_STEPS = 3;

const QUESTIONS = [
  {
    id: "category",
    title: "¿Qué buscas?",
    options: [
      { value: "guantes", label: "Guantes", searchQuery: "guantes nitrilo" },
      {
        value: "ortodoncia",
        label: "Ortodoncia",
        sectionSlug: "ortodoncia-brackets-y-tubos",
        searchQuery: "brackets",
      },
      {
        value: "profilaxis",
        label: "Profilaxis",
        sectionSlug: "consumibles-y-profilaxis",
        searchQuery: "profilaxis",
      },
      {
        value: "instrumental",
        label: "Instrumental",
        sectionSlug: "instrumental-clinico",
        searchQuery: "instrumental",
      },
      {
        value: "consumibles",
        label: "Consumibles",
        sectionSlug: "consumibles-y-profilaxis",
        searchQuery: "consumibles",
      },
    ],
  },
  {
    id: "priority",
    title: "¿Qué es más importante para ti?",
    options: [
      { value: "precio", label: "Precio", sort: "price-asc" },
      { value: "calidad", label: "Calidad", sort: "relevance" },
      { value: "envio", label: "Envío rápido", sort: "relevance" },
    ],
  },
  {
    id: "usage",
    title: "¿Para qué lo necesitas?",
    options: [
      { value: "clinica", label: "Clínica diaria", searchQuery: "" },
      { value: "especialidad", label: "Especialidad", searchQuery: "" },
      { value: "estudiante", label: "Estudiante", searchQuery: "", priceRange: "low" },
    ],
  },
];

/**
 * Mapea las respuestas del quiz a parámetros de búsqueda
 */
function mapAnswersToSearchParams(answers: QuizState["answers"]) {
  const params = new URLSearchParams();

  // Obtener la pregunta de categoría
  const categoryQuestion = QUESTIONS[0];
  const categoryOption = categoryQuestion.options.find(
    (opt) => opt.value === answers.category,
  ) as CategoryOption | undefined;

  if (categoryOption) {
    // Si tiene sectionSlug, usar esa sección
    if (categoryOption.sectionSlug) {
      return {
        type: "section" as const,
        path: `/catalogo/${categoryOption.sectionSlug}`,
        params,
      };
    }

    // Si tiene searchQuery, usar búsqueda
    if (categoryOption.searchQuery) {
      params.set("q", categoryOption.searchQuery);
    }
  }

  // Aplicar sort si existe
  const priorityQuestion = QUESTIONS[1];
  const priorityOption = priorityQuestion.options.find(
    (opt) => opt.value === answers.priority,
  ) as PriorityOption | undefined;
  if (priorityOption?.sort) {
    params.set("sort", priorityOption.sort);
  }

  // Aplicar priceRange si existe
  const usageQuestion = QUESTIONS[2];
  const usageOption = usageQuestion.options.find(
    (opt) => opt.value === answers.usage,
  ) as UsageOption | undefined;
  if (usageOption?.priceRange) {
    params.set("priceRange", usageOption.priceRange);
  }

  return {
    type: "search" as const,
    path: "/buscar",
    params,
  };
}

/**
 * Guarda el estado del quiz en sessionStorage
 */
function saveQuizState(state: QuizState) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Silenciar errores de sessionStorage
  }
}

/**
 * Carga el estado del quiz desde sessionStorage
 */
function loadQuizState(): QuizState | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = sessionStorage.getItem(QUIZ_STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as QuizState;
  } catch {
    return null;
  }
}

/**
 * Limpia el estado del quiz
 */
function clearQuizState() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(QUIZ_STORAGE_KEY);
  } catch {
    // Silenciar errores
  }
}

export default function QuizClient() {
  const router = useRouter();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [state, setState] = useState<QuizState>(() => {
    // Intentar cargar estado guardado
    const saved = loadQuizState();
    if (saved) {
      return saved;
    }
    return {
      step: 0,
      answers: {},
    };
  });

  const [showContinue, setShowContinue] = useState(false);

  // Verificar si hay estado guardado al montar
  useEffect(() => {
    const saved = loadQuizState();
    if (saved && saved.step > 0 && saved.step < TOTAL_STEPS) {
      setShowContinue(true);
    }
  }, []);

  const currentQuestion = QUESTIONS[state.step];
  const progress = ((state.step + 1) / TOTAL_STEPS) * 100;

  const handleAnswer = (value: string) => {
    const newAnswers = {
      ...state.answers,
      [currentQuestion.id]: value,
    };

    const newState: QuizState = {
      step: state.step + 1,
      answers: newAnswers,
    };

    setState(newState);
    saveQuizState(newState);

    // Si es el último paso, redirigir
    if (newState.step >= TOTAL_STEPS) {
      const result = mapAnswersToSearchParams(newAnswers);
      clearQuizState();

      const finalPath =
        result.params.toString() !== ""
          ? `${result.path}?${result.params.toString()}`
          : result.path;

      router.push(finalPath);
    }
  };

  const handleContinue = () => {
    setShowContinue(false);
    // El estado ya está cargado, solo continuar
  };

  const handleRestart = () => {
    clearQuizState();
    setState({
      step: 0,
      answers: {},
    });
    setShowContinue(false);
  };

  // Pantalla de bienvenida o continuar
  if (state.step === 0 && !showContinue) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div
            className={`inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary-100 dark:bg-primary-900/30 ${
              prefersReducedMotion ? "" : "animate-pulse-subtle"
            }`}
          >
            <Sparkles className="w-10 h-10 text-primary-600 dark:text-primary-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Te recomiendo en 30 segundos
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Responde 3 preguntas rápidas y te mostraremos los productos perfectos para ti
          </p>
          <button
            onClick={() => setState({ ...state, step: 0 })}
            className="w-full min-h-[44px] px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            Comenzar
          </button>
        </div>
      </div>
    );
  }

  // Pantalla de continuar/reiniciar
  if (showContinue && state.step === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            ¿Continuar donde quedaste?
          </h2>
          <div className="space-y-3">
            <button
              onClick={handleContinue}
              className="w-full min-h-[44px] px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              Continuar
            </button>
            <button
              onClick={handleRestart}
              className="w-full min-h-[44px] px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Reiniciar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Stepper */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Paso {state.step + 1} de {TOTAL_STEPS}
            </span>
            <button
              onClick={handleRestart}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              Reiniciar
            </button>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Pregunta */}
        <div className="space-y-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            {currentQuestion.title}
          </h2>

          <div className="space-y-3">
            {currentQuestion.options.map((option) => (
              <button
                key={option.value}
                onClick={() => handleAnswer(option.value)}
                className={`w-full min-h-[44px] px-6 py-4 text-left bg-white dark:bg-gray-800 border-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                  state.answers[currentQuestion.id as keyof typeof state.answers] ===
                  option.value
                    ? "border-primary-600 bg-primary-50 dark:bg-primary-900/20"
                    : "border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {option.label}
                  </span>
                  <ChevronRight
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      prefersReducedMotion ? "" : "group-hover:translate-x-1"
                    }`}
                  />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
