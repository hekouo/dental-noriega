"use client";

import React, { useState, useRef, useEffect } from "react";
import { MessageSquare } from "lucide-react";
import { FeedbackForm } from "./FeedbackForm.client";

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClose = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 left-6 z-40 flex items-center gap-2 rounded-full bg-stone-600 dark:bg-stone-500 text-white px-4 py-2.5 text-sm font-medium shadow-lg hover:bg-stone-700 dark:hover:bg-stone-600 focus-premium"
        aria-label="Abrir formulario de opiniones"
      >
        <MessageSquare className="w-4 h-4" aria-hidden />
        Feedback
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={(e) => e.target === e.currentTarget && handleClose()}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-dialog-title"
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="feedback-dialog-title" className="text-lg font-semibold text-stone-900 dark:text-white mb-4">
              Envíanos tu opinión
            </h2>
            <FeedbackForm onSuccess={handleClose} />
          </div>
        </div>
      )}
    </>
  );
}
