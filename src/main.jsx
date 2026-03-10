import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { ToastProvider } from "./components/Toast.jsx";
import "./index.css";

// Manejo global para errores de chunks dinámicos (cuando Vercel despliega nueva versión y el navegador pide hash viejo)
window.addEventListener("vite:preloadError", (event) => {
  console.warn("Fallo al cargar módulo dinámico. Recargando para obtener la nueva versión...", event);
  window.location.reload();
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>,
);
