"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { RatingStars } from "./RatingStars";

type ReviewRow = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  author_name: string | null;
  is_example?: boolean;
  created_at?: string;
};

type ApiResponse = {
  product_id: string;
  average_rating: number;
  review_count: number;
  real_reviews: ReviewRow[];
  example_reviews: ReviewRow[];
};

const REAL_LIMIT = 10;
const EXAMPLE_LIMIT = 6;

type Props = { productId: string };

export function ProductReviews({ productId }: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "ok">("loading");
  const [data, setData] = useState<ApiResponse | null>(null);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [submitError, setSubmitError] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  const [rating, setRating] = useState("");
  const [body, setBody] = useState("");
  const [authorName, setAuthorName] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!productId) return;
    const ac = new AbortController();
    abortRef.current = ac;
    setStatus("loading");
    fetch(`/api/reviews?product_id=${encodeURIComponent(productId)}`, { signal: ac.signal })
      .then((res) => {
        if (!res.ok) throw new Error("fetch failed");
        return res.json();
      })
      .then((json: ApiResponse) => {
        if (abortRef.current !== ac) return;
        setData(json);
        setStatus("ok");
      })
      .catch((e) => {
        if (e.name === "AbortError" || abortRef.current !== ac) return;
        setStatus("error");
      });
    return () => {
      ac.abort();
      abortRef.current = null;
    };
  }, [productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = parseInt(rating, 10);
    if (!Number.isFinite(r) || r < 1 || r > 5) {
      setSubmitError("Elige una valoración de 1 a 5.");
      return;
    }
    if (body.trim() && body.trim().length < 10) {
      setSubmitError("El comentario debe tener al menos 10 caracteres.");
      return;
    }
    setSubmitError("");
    setNeedsLogin(false);
    setSubmitStatus("loading");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: productId,
          rating: r,
          body: body.trim() || undefined,
          author_name: authorName.trim() || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      const payload = json as { error?: string; message?: string };

      if (res.status === 401) {
        setSubmitStatus("error");
        setNeedsLogin(true);
        setSubmitError(payload.message ?? "Inicia sesión para escribir una reseña.");
        return;
      }

      if (res.status === 429) {
        setSubmitStatus("error");
        setSubmitError(
          payload.message ?? payload.error ?? "Ya enviaste una reseña para este producto recientemente.",
        );
        return;
      }

      if (!res.ok) {
        setSubmitStatus("error");
        setSubmitError(payload.error ?? payload.message ?? "Error al enviar.");
        return;
      }

      setSubmitStatus("success");
      setRating("");
      setBody("");
      setAuthorName("");
      setData((prev) =>
        prev
          ? {
              ...prev,
              review_count: prev.review_count + 1,
              real_reviews: prev.real_reviews,
            }
          : null,
      );
    } catch {
      setSubmitStatus("error");
      setSubmitError("Error de conexión.");
    }
  };

  const real = data?.real_reviews?.slice(0, REAL_LIMIT) ?? [];
  const examples = data?.example_reviews?.slice(0, EXAMPLE_LIMIT) ?? [];

  return (
    <section className="mt-12 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm p-6" aria-labelledby="reviews-heading">
      <h2 id="reviews-heading" className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Reseñas
      </h2>

      {status === "loading" && (
        <p className="text-gray-500 dark:text-gray-400 text-sm">Cargando reseñas…</p>
      )}
      {status === "error" && (
        <p className="text-red-600 dark:text-red-400 text-sm">No se pudieron cargar las reseñas.</p>
      )}
      {status === "ok" && data && (
        <>
          <div className="flex items-center gap-3 mb-4">
            <RatingStars rating={data.average_rating} />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {data.average_rating.toFixed(1)} · {data.review_count} reseña{data.review_count !== 1 ? "s" : ""}
            </span>
          </div>

          {real.length === 0 && examples.length === 0 && (
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Aún no hay reseñas</p>
          )}

          {real.length > 0 && (
            <ul className="space-y-4 mb-6 list-none p-0 m-0">
              {real.map((r) => (
                <li key={r.id} className="border-b border-gray-100 dark:border-gray-700 pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2 mb-1">
                    <RatingStars rating={r.rating} />
                    {r.author_name && (
                      <span className="text-sm text-gray-600 dark:text-gray-400">{r.author_name}</span>
                    )}
                  </div>
                  {r.title && <p className="font-medium text-gray-900 dark:text-white text-sm">{r.title}</p>}
                  {r.body && <p className="text-sm text-gray-700 dark:text-gray-300">{r.body}</p>}
                </li>
              ))}
            </ul>
          )}

          {examples.length > 0 && (
            <div className="mb-6">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
                Reseñas destacadas (EJEMPLO)
              </h3>
              <ul className="space-y-4 list-none p-0 m-0">
                {examples.map((r) => (
                  <li key={r.id} className="border border-amber-200 dark:border-amber-800 rounded-lg p-4 bg-amber-50/50 dark:bg-amber-900/10">
                    <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 mb-2">
                      EJEMPLO
                    </span>
                    <div className="flex items-center gap-2 mb-1">
                      <RatingStars rating={r.rating} />
                      {r.author_name && (
                        <span className="text-sm text-gray-600 dark:text-gray-400">{r.author_name}</span>
                      )}
                    </div>
                    {r.title && <p className="font-medium text-gray-900 dark:text-white text-sm">{r.title}</p>}
                    {r.body && <p className="text-sm text-gray-700 dark:text-gray-300">{r.body}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Escribir reseña</h3>
        {(submitStatus === "success" || submitError) && (
          <div role="status" aria-live="polite" className="mb-3 text-sm space-y-2">
            {submitStatus === "success" && (
              <p className="text-green-700 dark:text-green-300">
                Gracias, tu reseña será revisada
              </p>
            )}
            {submitError && (
              <div className="text-red-600 dark:text-red-400 space-y-1">
                <p>{submitError}</p>
                {needsLogin && (
                  <Link
                    href="/cuenta"
                    className="inline-flex items-center text-sm font-medium text-primary-700 dark:text-primary-300 hover:underline"
                  >
                    Iniciar sesión
                  </Link>
                )}
              </div>
            )}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="review-rating" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Valoración *
            </label>
            <select
              id="review-rating"
              required
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              disabled={submitStatus === "loading"}
              className="w-full max-w-[120px] rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm focus-premium"
            >
              <option value="">—</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>{n} estrella{n !== 1 ? "s" : ""}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="review-body" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Comentario (recomendado, min 10 caracteres)
            </label>
            <textarea
              id="review-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={submitStatus === "loading"}
              rows={3}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm focus-premium resize-y"
              placeholder="Opciónal pero recomendado"
            />
          </div>
          <div>
            <label htmlFor="review-author" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tu nombre (opcional)
            </label>
            <input
              id="review-author"
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              disabled={submitStatus === "loading"}
              className="w-full max-w-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm focus-premium"
            />
          </div>
          <button
            type="submit"
            disabled={submitStatus === "loading"}
            className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 focus-premium"
          >
            {submitStatus === "loading" ? "Enviando…" : "Enviar reseña"}
          </button>
        </form>
      </div>
    </section>
  );
}
