"use client";

import React, { useState } from "react";

const TYPES = [
  { value: "bug", label: "Bug o error" },
  { value: "idea", label: "Idea" },
  { value: "opinion", label: "Opinión" },
  { value: "other", label: "Otro" },
] as const;

type Status = "idle" | "loading" | "success" | "error";

type Props = {
  defaultPagePath?: string;
  onSuccess?: () => void;
  className?: string;
};

export function FeedbackForm({ defaultPagePath, onSuccess, className = "" }: Props) {
  const [type, setType] = useState<string>("opinion");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState<string>("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim().length < 10) {
      setStatus("error");
      setErrorMsg("El mensaje debe tener al menos 10 caracteres.");
      return;
    }
    setStatus("loading");
    setErrorMsg("");
    const payload = {
      type: type as "bug" | "idea" | "opinion" | "other",
      message: message.trim(),
      rating: rating ? parseInt(rating, 10) : undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      page_path: defaultPagePath ?? (typeof window !== "undefined" ? window.location.pathname : null),
    };
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setErrorMsg((data as { error?: string }).error ?? "Error al enviar.");
        return;
      }
      setStatus("success");
      setMessage("");
      setRating("");
      setEmail("");
      setPhone("");
      onSuccess?.();
    } catch {
      setStatus("error");
      setErrorMsg("Error de conexión.");
    }
  };

  if (status === "success") {
    return (
      <p className="text-green-700 dark:text-green-300 font-medium" role="status">
        Gracias, recibimos tu opinión.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className}`} noValidate>
      <div>
        <label htmlFor="feedback-type" className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
          Tipo *
        </label>
        <select
          id="feedback-type"
          required
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full rounded-lg border border-stone-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-stone-900 dark:text-stone-100 px-3 py-2 text-sm focus-premium"
          aria-required="true"
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="feedback-message" className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
          Mensaje *
        </label>
        <textarea
          id="feedback-message"
          required
          minLength={10}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-stone-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-stone-900 dark:text-stone-100 px-3 py-2 text-sm focus-premium resize-y"
          placeholder="Mínimo 10 caracteres"
          aria-required="true"
        />
      </div>
      <div>
        <label htmlFor="feedback-rating" className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
          Valoración (opcional)
        </label>
        <select
          id="feedback-rating"
          value={rating}
          onChange={(e) => setRating(e.target.value)}
          className="w-full rounded-lg border border-stone-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-stone-900 dark:text-stone-100 px-3 py-2 text-sm focus-premium"
        >
          <option value="">—</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="feedback-email" className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
          Email (opcional)
        </label>
        <input
          id="feedback-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-stone-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-stone-900 dark:text-stone-100 px-3 py-2 text-sm focus-premium"
        />
      </div>
      <div>
        <label htmlFor="feedback-phone" className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
          Teléfono (opcional)
        </label>
        <input
          id="feedback-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded-lg border border-stone-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-stone-900 dark:text-stone-100 px-3 py-2 text-sm focus-premium"
        />
      </div>
      {status === "error" && errorMsg && (
        <p className="text-red-600 dark:text-red-400 text-sm" role="alert">
          {errorMsg}
        </p>
      )}
      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full sm:w-auto px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 focus-premium"
      >
        {status === "loading" ? "Enviando…" : "Enviar"}
      </button>
    </form>
  );
}
