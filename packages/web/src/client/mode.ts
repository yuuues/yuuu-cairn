// Modo de ejecución del cliente: local-first por defecto.
// HTTP/online solo si VITE_LOCAL === "false".
export const USE_LOCAL = import.meta.env.VITE_LOCAL !== "false";
