import { execSync } from "child_process";
import fs from "fs";
import path from "path";

// Limpiar la carpeta dist anterior
if (fs.existsSync("dist")) {
  console.log("Limpiando carpeta dist anterior...");
  try {
    fs.rmSync("dist", { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  } catch (err) {
    console.warn("Advertencia: No se pudo limpiar 'dist' completamente. Continuando...", err.message);
  }
}

// 1. Instalar dependencias de web-cliente
console.log("Instalando dependencias de web-cliente...");
execSync("npm install --prefix web-cliente", { stdio: "inherit" });

// 2. Compilar el Punto de Venta (POS) en dist/pos
console.log("Compilando el Punto de Venta (POS) en dist/pos...");
process.env.VITE_BASE_URL = "/pos/";
process.env.VITE_OUT_DIR = "dist/pos";
execSync("npx vite build", { stdio: "inherit" });

// 3. Compilar el Cliente Web en web-cliente/dist
console.log("Compilando el Cliente Web en web-cliente/dist...");
execSync("npm run build --prefix web-cliente", { stdio: "inherit" });

// 4. Copiar archivos de web-cliente/dist a la raíz de dist/
console.log("Copiando archivos compilados del Cliente Web a la raíz de dist/...");
const srcClient = path.join("web-cliente", "dist");
const destRoot = "dist";

// Copiar recursivamente
fs.cpSync(srcClient, destRoot, { recursive: true });

console.log("¡Compilación unificada completada con éxito!");
