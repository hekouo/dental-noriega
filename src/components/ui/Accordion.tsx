"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

type AccordionItemProps = {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
};

function AccordionItem({ title, children, defaultOpen = false }: AccordionItemProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded"
        aria-expanded={isOpen}
        aria-controls={`accordion-content-${title}`}
      >
        <span className="font-semibold text-gray-900 dark:text-gray-100">{title}</span>
        <ChevronDown
          className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${
            isOpen ? "transform rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>
      {isOpen && (
        <div
          id={`accordion-content-${title}`}
          className="pb-4 text-sm text-gray-600 dark:text-gray-300 leading-relaxed"
        >
          {children}
        </div>
      )}
    </div>
  );
}

type AccordionProps = {
  children: React.ReactNode;
};

export function Accordion({ children }: AccordionProps) {
  return <div className="space-y-0">{children}</div>;
}

Accordion.Item = AccordionItem;

