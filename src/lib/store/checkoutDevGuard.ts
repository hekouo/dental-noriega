// Solo en desarrollo
import { useCheckoutStore } from "./checkoutStore";

if (process.env.NODE_ENV === "development") {
  let writes = 0;
  useCheckoutStore.subscribe(() => {
    writes++;
    if (writes > 20)
      console.warn("[checkoutStore] Posible loop: >20 writes en un tick");
    queueMicrotask(() => {
      writes = 0;
    });
  });
  // opcional: exportar unsub si necesitas limpiarlo
  // export { unsub };
}
