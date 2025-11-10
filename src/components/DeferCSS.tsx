"use client";

import { useEffect } from "react";

// Diferir CSS no crítico usando media="print" + swap
export default function DeferCSS() {
  useEffect(() => {
    // Encontrar todos los links de CSS y diferirlos
    const links = document.querySelectorAll<HTMLLinkElement>(
      'link[rel="stylesheet"]:not([data-critical])',
    );
    links.forEach((link) => {
      // Si ya tiene media, no tocar
      if (link.media && link.media !== "all" && link.media !== "") return;
      // Marcar como no crítico y diferir
      link.media = "print";
      link.setAttribute("data-deferred", "true");
      link.onload = function () {
        if (this instanceof HTMLLinkElement) {
          this.media = "all";
        }
      };
    });
  }, []);

  return null;
}


