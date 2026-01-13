"use client";

import React, { useEffect, useRef, useState } from "react";
import type { UseFormSetValue, UseFormRegisterReturn } from "react-hook-form";
import type { DatosForm } from "@/lib/checkout/schemas";

// Tipos para Google Places API
interface AddressComponents {
  street_number?: string;
  route?: string;
  sublocality_level_1?: string; // Colonia
  locality?: string; // Ciudad
  administrative_area_level_1?: string; // Estado
  postal_code?: string;
  country?: string;
}

interface AddressAutocompleteClientProps {
  setValue: UseFormSetValue<DatosForm>;
  register: UseFormRegisterReturn<"address">;
  errors?: { address?: { message?: string } };
  onAddressSelect?: (address: string) => void;
}

// Tipos para Google Places API
declare global {
  interface Window {
    google?: {
      maps: {
        places: GoogleMapsPlaces;
      };
    };
  }
  
  // Tipos para Google Places API (usando interfaz en lugar de namespace para evitar lint error)
  interface GoogleMapsPlacesAutocomplete {
    new (
      input: HTMLInputElement | HTMLTextAreaElement,
      options?: {
        componentRestrictions?: { country: string | string[] };
        fields?: string[];
        types?: string[];
      }
    ): {
      addListener(event: string, callback: () => void): void;
      getPlace(): {
        place_id: string;
        address_components: Array<{
          long_name: string;
          short_name: string;
          types: string[];
        }>;
        formatted_address: string;
      };
    };
  }
  
  interface GoogleMapsPlaces {
    Autocomplete: GoogleMapsPlacesAutocomplete;
  }
  
  interface GoogleMaps {
    places: GoogleMapsPlaces;
  }
  
  interface Google {
    maps: GoogleMaps;
  }
}

/**
 * Componente de autocomplete de direcciones con Google Places API
 * Solo se activa si existe NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
 * Si no hay API key o falla, renderiza input normal sin errores
 */
export default function AddressAutocompleteClient({
  setValue,
  register,
  errors,
  onAddressSelect,
}: AddressAutocompleteClientProps) {
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const autocompleteRef = useRef<{
    addListener: (event: string, callback: () => void) => void;
    getPlace: () => {
      place_id: string;
      address_components: Array<{
        long_name: string;
        short_name: string;
        types: string[];
      }>;
      formatted_address: string;
    };
  } | null>(null);
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [autocompleteError, setAutocompleteError] = useState<string | null>(null);

  const googlePlacesApiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;

  // Verificar si hay API key
  useEffect(() => {
    setHasApiKey(!!googlePlacesApiKey);
  }, [googlePlacesApiKey]);

  // Cargar script de Google Places API solo si hay API key
  useEffect(() => {
    if (!hasApiKey) {
      // Sin API key: no cargar script, usar input normal
      return;
    }

    // Verificar si ya está cargado
    if (window.google?.maps?.places) {
      setIsGoogleLoaded(true);
      return;
    }

    // Cargar script de Google Places API
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${googlePlacesApiKey}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (window.google?.maps?.places) {
        setIsGoogleLoaded(true);
        setAutocompleteError(null);
      } else {
        setAutocompleteError("No se pudo cargar Google Places API");
      }
    };

    script.onerror = () => {
      setAutocompleteError("Error al cargar Google Places API");
      setIsGoogleLoaded(false);
    };

    document.head.appendChild(script);

    return () => {
      // Limpiar script si el componente se desmonta
      const existingScript = document.querySelector(
        `script[src*="maps.googleapis.com/maps/api/js"]`,
      );
      if (existingScript && existingScript.parentNode) {
        existingScript.parentNode.removeChild(existingScript);
      }
    };
  }, [hasApiKey, googlePlacesApiKey]);

  // Inicializar autocomplete cuando Google esté cargado
  useEffect(() => {
    if (!isGoogleLoaded || !hasApiKey || !inputRef.current) {
      return;
    }

    try {
      // Limpiar autocomplete anterior si existe
      if (autocompleteRef.current) {
        // No hay método de destrucción directo, solo reasignar
        autocompleteRef.current = null;
      }

      // Verificar que window.google existe
      if (!window.google?.maps?.places) {
        setAutocompleteError("Google Places API no está disponible");
        return;
      }

      // Crear nuevo autocomplete
      const autocomplete = new window.google.maps.places.Autocomplete(
        inputRef.current,
        {
          componentRestrictions: { country: "mx" }, // Restringir a México
          fields: [
            "address_components",
            "formatted_address",
            "place_id",
            "geometry",
          ],
          types: ["address"], // Solo direcciones
        },
      );

      autocompleteRef.current = autocomplete;

      // Listener para cuando se selecciona una dirección
      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();

        if (!place.address_components || place.address_components.length === 0) {
          return;
        }

        // Parsear address_components
        const components: AddressComponents = {};
        place.address_components.forEach((component) => {
          const type = component.types[0];
          if (type === "street_number") {
            components.street_number = component.long_name;
          } else if (type === "route") {
            components.route = component.long_name;
          } else if (type === "sublocality_level_1" || type === "sublocality") {
            components.sublocality_level_1 = component.long_name;
          } else if (type === "locality") {
            components.locality = component.long_name;
          } else if (type === "administrative_area_level_1") {
            components.administrative_area_level_1 = component.short_name;
          } else if (type === "postal_code") {
            components.postal_code = component.long_name;
          } else if (type === "country") {
            components.country = component.short_name;
          }
        });

        // Construir dirección completa (calle + número)
        const streetParts: string[] = [];
        if (components.street_number) {
          streetParts.push(components.street_number);
        }
        if (components.route) {
          streetParts.push(components.route);
        }
        const address1 = streetParts.length > 0 ? streetParts.join(" ") : place.formatted_address;

        // Actualizar campos del formulario
        setValue("address", address1, { shouldValidate: true });

        // Colonia (opcional)
        if (components.sublocality_level_1) {
          setValue("neighborhood", components.sublocality_level_1, { shouldValidate: true });
        }

        // Ciudad
        if (components.locality) {
          setValue("city", components.locality, { shouldValidate: true });
        }

        // Estado (usar short_name para coincidir con MX_STATES)
        if (components.administrative_area_level_1) {
          // Mapear abreviaciones a nombres completos si es necesario
          const stateName = mapStateAbbreviationToFullName(components.administrative_area_level_1);
          if (stateName) {
            setValue("state", stateName, { shouldValidate: true });
          }
        }

        // Código postal
        if (components.postal_code) {
          setValue("cp", components.postal_code.slice(0, 5), { shouldValidate: true });
        }

        // Callback opcional
        if (onAddressSelect) {
          onAddressSelect(place.formatted_address);
        }
      });

      setAutocompleteError(null);
    } catch (error) {
      console.warn("[AddressAutocomplete] Error inicializando autocomplete:", error);
      setAutocompleteError("Error al inicializar autocomplete");
    }

    return () => {
      // Limpiar autocomplete al desmontar
      if (autocompleteRef.current) {
        autocompleteRef.current = null;
      }
    };
  }, [isGoogleLoaded, hasApiKey, setValue, onAddressSelect]);

  // Mapear abreviaciones de estados a nombres completos
  const mapStateAbbreviationToFullName = (abbrev: string): string | null => {
    const stateMap: Record<string, string> = {
      AG: "Aguascalientes",
      BC: "Baja California",
      BS: "Baja California Sur",
      CM: "Campeche",
      CS: "Chiapas",
      DF: "Ciudad de México",
      CO: "Coahuila",
      CL: "Colima",
      DG: "Durango",
      EM: "Estado de México",
      GT: "Guanajuato",
      GR: "Guerrero",
      HG: "Hidalgo",
      JA: "Jalisco",
      MI: "Michoacán",
      MO: "Morelos",
      NA: "Nayarit",
      NL: "Nuevo León",
      OA: "Oaxaca",
      PU: "Puebla",
      QT: "Querétaro",
      QR: "Quintana Roo",
      SL: "San Luis Potosí",
      SI: "Sinaloa",
      SO: "Sonora",
      TB: "Tabasco",
      TM: "Tamaulipas",
      TL: "Tlaxcala",
      VE: "Veracruz",
      YU: "Yucatán",
      ZA: "Zacatecas",
    };

    return stateMap[abbrev.toUpperCase()] || null;
  };

  // Si no hay API key, renderizar textarea normal (sin autocomplete)
  if (!hasApiKey) {
    return (
      <textarea
        id="address"
        rows={3}
        {...register}
        placeholder="Ej: Av. Insurgentes Sur 123, Int. 45"
        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
          errors?.address ? "border-red-500" : "border-gray-300"
        }`}
        aria-invalid={errors?.address ? "true" : "false"}
        aria-describedby={errors?.address ? "address-error" : "address-help"}
      />
    );
  }

  // Si hay error, mostrar aviso suave pero no romper el formulario
  if (autocompleteError && process.env.NODE_ENV === "development") {
    console.warn("[AddressAutocomplete]", autocompleteError);
  }

  // Renderizar textarea con autocomplete
  return (
    <>
      {autocompleteError && (
        <p className="text-xs text-amber-600 mt-1">
          Autocomplete no disponible. Puedes escribir la dirección manualmente.
        </p>
      )}
      <textarea
        ref={(el) => {
          // Asignar a inputRef
          (inputRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
          // Llamar al ref de register si existe
          if (register.ref) {
            register.ref(el);
          }
        }}
        id="address"
        rows={3}
        name={register.name}
        onChange={register.onChange}
        onBlur={register.onBlur}
        placeholder="Ej: Av. Insurgentes Sur 123, Int. 45"
        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
          errors?.address ? "border-red-500" : "border-gray-300"
        }`}
        aria-invalid={errors?.address ? "true" : "false"}
        aria-describedby={errors?.address ? "address-error" : "address-help"}
        aria-label="Dirección con autocomplete de Google Places"
      />
    </>
  );
}
