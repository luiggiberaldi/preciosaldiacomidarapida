import React, { useState, useEffect, useRef, Suspense, lazy } from "react";
import {
  Home,
  ShoppingCart,
  Store,
  Users,
  Download,
  FlaskConical,
  Key,
  Moon,
  Sun,
  BarChart3,
  WifiOff,
  Flame,
  BellRing,
  X,
} from "lucide-react";

import SalesView from "./views/SalesView";
import DashboardView from "./views/DashboardView";
// Lazy-loaded views (no se usan al inicio crítico)
const ProductsView = lazy(() =>
  import("./views/ProductsView").then((m) => ({ default: m.ProductsView })),
);
const CustomersView = lazy(() => import("./views/CustomersView"));
const KitchenView = lazy(() => import("./views/KitchenView"));
const ReportsView = lazy(() => import("./views/ReportsView"));
const InboxView = lazy(() =>
  import("./views/InboxView").then((m) => ({ default: m.InboxView })),
);
const TesterView = lazy(() =>
  import("./views/TesterView").then((m) => ({ default: m.TesterView })),
);

import { useRates } from "./hooks/useRates";
import { useSecurity } from "./hooks/useSecurity";
import { useWebOrders } from "./hooks/useWebOrders";
import PremiumGuard from "./components/security/PremiumGuard";
import TermsOverlay from "./components/TermsOverlay";
import OnboardingOverlay from "./components/OnboardingOverlay";
import ErrorBoundary from "./components/ErrorBoundary";
import { useOfflineQueue } from "./hooks/useOfflineQueue";

export default function App() {
  const [activeTab, setActiveTab] = useState("inicio");
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showIOSInstall, setShowIOSInstall] = useState(false);

  // Detectar iOS Safari (no standalone) para mostrar instrucciones manuales
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const showIOSButton = isIOS && !isStandalone && !localStorage.getItem('ios_install_dismissed');

  // Admin Panel States
  const [adminClicks, setAdminClicks] = useState(0);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showTester, setShowTester] = useState(false);
  const [clientDeviceId, setClientDeviceId] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");

  const { rates, loading, isOffline, updateData } = useRates();
  const {
    generateCodeForClient,
    isPremium,
    isDemo,
    demoTimeLeft,
    demoExpiredMsg,
    dismissExpiredMsg,
  } = useSecurity();
  const { isOnline, cacheRates } = useOfflineQueue();
  const storeConfig = { name: "PreciosAlDía Comida Rápida", whatsappNumber: "" }; // Will be populated from hook later

  // Global web orders hook for bottom nav badge
  const { orders: webOrders } = useWebOrders();
  const pendingWebCount = webOrders.filter(
    (o) => o.status === "pending",
  ).length;

  // Cache rates whenever they update
  useEffect(() => {
    if (rates) cacheRates(rates);
  }, [rates, cacheRates]);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") setInstallPrompt(null);
  };

  // Theme
  const [theme, setTheme] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme");
      if (saved) return saved;
      return "light"; // Forced light mode by default for Bodega
    }
    return "light";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () =>
    setTheme((prev) => (prev === "light" ? "dark" : "light"));

  // Haptic
  const triggerHaptic = () => {
    if (
      typeof window !== "undefined" &&
      window.navigator &&
      window.navigator.vibrate
    ) {
      window.navigator.vibrate(10);
    }
  };

  // Admin Panel Logic (Hidden — 10 clicks on top-left corner)
  const handleLogoClick = () => {
    const now = Date.now();
    if (window.lastClickTime && now - window.lastClickTime > 1000) {
      setAdminClicks(1);
    } else {
      setAdminClicks((prev) => prev + 1);
    }
    window.lastClickTime = now;

    if (adminClicks + 1 >= 10) {
      setShowAdminPanel(true);
      setAdminClicks(0);
      triggerHaptic();
    }
  };

  const handleGenerateCode = async (e) => {
    e.preventDefault();
    if (!clientDeviceId) return;
    const code = await generateCodeForClient(clientDeviceId);
    setGeneratedCode(code);
  };

  // Keyboard detection
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const baseHeight = useRef(0);

  useEffect(() => {
    if (!window.visualViewport) return;
    if (!baseHeight.current) baseHeight.current = window.visualViewport.height;

    const handleViewport = () => {
      setIsKeyboardOpen(
        window.visualViewport.height < baseHeight.current - 100,
      );
    };
    const handleFocusBack = () => setTimeout(handleViewport, 300);

    window.visualViewport.addEventListener("resize", handleViewport);
    window.visualViewport.addEventListener("scroll", handleViewport);
    window.addEventListener("focusin", handleFocusBack);
    window.addEventListener("focusout", handleFocusBack);

    return () => {
      window.visualViewport?.removeEventListener("resize", handleViewport);
      window.visualViewport?.removeEventListener("scroll", handleViewport);
      window.removeEventListener("focusin", handleFocusBack);
      window.removeEventListener("focusout", handleFocusBack);
    };
  }, []);

  const TABS = [
    { id: "inicio", label: "Inicio", icon: Home },
    { id: "ventas", label: "Vender", icon: ShoppingCart },
    { id: "cocina", label: "Cocina", icon: Flame },
    {
      id: "inbox",
      label: "Pedidos",
      icon: BellRing,
      badge: pendingWebCount,
    },
    { id: "catalogo", label: "Menú", icon: Store },
  ];

  return (
    <div className="font-sans antialiased bg-slate-50 dark:bg-black h-[100dvh] flex flex-col overflow-clip transition-colors duration-300">
      {/* Terms and Conditions Overlay (First Use) */}
      <TermsOverlay />

      {/* Tutorial Onboarding (First Use, after Terms) */}
      <OnboardingOverlay isPremium={isPremium} />

      {/* Offline Banner */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-[200] flex justify-center pt-[env(safe-area-inset-top)]">
          <div className="mt-2 px-4 py-2 bg-slate-900/95 backdrop-blur-md rounded-full border border-red-500/30 shadow-xl flex items-center gap-2 animate-in slide-in-from-top-4">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <WifiOff size={14} className="text-red-400" />
            <span className="text-xs font-bold text-white">
              Sin conexión · Modo offline
            </span>
          </div>
        </div>
      )}

      {/* Demo Banner (discreto — bottom, above nav) */}
      {isDemo && demoTimeLeft && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-4 fade-in duration-500 pointer-events-none">
          <div className="px-3 py-1.5 bg-slate-900/90 dark:bg-white/10 backdrop-blur-md rounded-full border border-white/10 shadow-xl flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
            <p className="text-[10px] font-semibold text-white tracking-wide">
              Licencia:{" "}
              <span className="text-red-400 font-bold">{demoTimeLeft}</span>
            </p>
          </div>
        </div>
      )}

      {/* Demo Expired Modal */}
      {demoExpiredMsg && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-5 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 max-w-sm shadow-2xl border border-slate-100 dark:border-slate-800 text-center animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⏳</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">
              Prueba finalizada
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
              {demoExpiredMsg}
            </p>
            <button
              onClick={() => {
                const msg = `Hola! Quiero adquirir la licencia Premium de PreciosAlDía Comida Rápida. Acabo de terminar mi prueba gratuita.`;
                window.open(
                  `https://wa.me/584124051793?text=${encodeURIComponent(msg)}`,
                  "_blank",
                );
              }}
              className="w-full py-3 bg-[#10B981] text-white font-bold rounded-xl shadow-lg shadow-red-500/20 active:scale-95 transition-transform text-sm mb-2"
            >
              Solicitar Licencia
            </button>
            <button
              onClick={dismissExpiredMsg}
              className="w-full py-2.5 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
            >
              Continuar con versión gratuita
            </button>
          </div>
        </div>
      )}

      {/* Golden Tester View Overlay */}
      {showTester && (
        <div className="fixed inset-0 z-[150] bg-slate-50 dark:bg-slate-950">
          <TesterView onBack={() => setShowTester(false)} />
        </div>
      )}

      <main
        className={`flex-1 min-h-0 w-full max-w-md md:max-w-2xl lg:max-w-7xl mx-auto relative ${isKeyboardOpen ? "pb-4" : "pb-24"} flex flex-col overflow-y-auto`}
      >
        {/* Hidden Admin Trigger Area */}
        <div
          className="absolute top-0 left-0 w-20 h-20 z-50 cursor-pointer opacity-0"
          onClick={handleLogoClick}
          title="Ssshh..."
        ></div>

        {/* Eager views — always mounted, visibility toggled via CSS */}
        <div
          className={`flex-1 min-h-0 flex flex-col ${activeTab === "ventas" ? "" : "hidden"}`}
        >
          <ErrorBoundary>
            <PremiumGuard featureName="Punto de Venta" isShop={true}>
              <SalesView
                rates={rates}
                triggerHaptic={triggerHaptic}
                onNavigate={setActiveTab}
              />
            </PremiumGuard>
          </ErrorBoundary>
        </div>

        <div
          className={`flex-1 flex flex-col ${activeTab === "inicio" ? "" : "hidden"}`}
        >
          <ErrorBoundary>
            <DashboardView
              rates={rates}
              triggerHaptic={triggerHaptic}
              onNavigate={setActiveTab}
              theme={theme}
              toggleTheme={toggleTheme}
            />
          </ErrorBoundary>
        </div>

        {/* Lazy views — mount on first access, then stay persistent */}
        <Suspense
          fallback={
            <div className="flex-1 p-4 space-y-4">
              <div className="skeleton h-10 w-40" />
              <div className="skeleton h-32" />
              <div className="skeleton h-48" />
            </div>
          }
        >
          {(activeTab === "catalogo" ||
            document.querySelector('[data-view="catalogo"]')) && (
              <div
                data-view="catalogo"
                className={`flex-1 flex flex-col ${activeTab === "catalogo" ? "" : "hidden"}`}
              >
                <ErrorBoundary>
                  <ProductsView rates={rates} triggerHaptic={triggerHaptic} />
                </ErrorBoundary>
              </div>
            )}
          {(activeTab === "inbox" ||
            document.querySelector('[data-view="inbox"]')) && (
              <div
                data-view="inbox"
                className={`flex-1 flex flex-col ${activeTab === "inbox" ? "" : "hidden"}`}
              >
                <ErrorBoundary>
                  <PremiumGuard featureName="Pedidos en Línea" isShop={true}>
                    <InboxView rates={rates} storeConfig={storeConfig} />
                  </PremiumGuard>
                </ErrorBoundary>
              </div>
            )}
          {(activeTab === "clientes" ||
            document.querySelector('[data-view="clientes"]')) && (
              <div
                data-view="clientes"
                className={`flex-1 flex flex-col ${activeTab === "clientes" ? "" : "hidden"}`}
              >
                <ErrorBoundary>
                  <PremiumGuard featureName="Gestión de Clientes">
                    <CustomersView
                      triggerHaptic={triggerHaptic}
                      onNavigate={setActiveTab}
                    />
                  </PremiumGuard>
                </ErrorBoundary>
              </div>
            )}
          {(activeTab === "reportes" ||
            document.querySelector('[data-view="reportes"]')) && (
              <div
                data-view="reportes"
                className={`flex-1 flex flex-col ${activeTab === "reportes" ? "" : "hidden"}`}
              >
                <ErrorBoundary>
                  <PremiumGuard featureName="Reportes Históricos">
                    <ReportsView rates={rates} triggerHaptic={triggerHaptic} />
                  </PremiumGuard>
                </ErrorBoundary>
              </div>
            )}
          {(activeTab === "cocina" ||
            document.querySelector('[data-view="cocina"]')) && (
              <div
                data-view="cocina"
                className={`flex-1 flex flex-col ${activeTab === "cocina" ? "" : "hidden"}`}
              >
                <ErrorBoundary>
                  <PremiumGuard featureName="Pantalla de Cocina / KDS">
                    <KitchenView
                      triggerHaptic={triggerHaptic}
                      onNavigate={setActiveTab}
                    />
                  </PremiumGuard>
                </ErrorBoundary>
              </div>
            )}
        </Suspense>
      </main>

      {/* Bottom Nav */}
      {!isKeyboardOpen && (
        <div className="fixed bottom-0 left-0 right-0 px-6 pb-[env(safe-area-inset-bottom)] pt-0 mb-6 max-w-md md:max-w-lg mx-auto z-30 pointer-events-none animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-xl rounded-3xl p-1.5 flex justify-between items-center shadow-2xl shadow-slate-900/30 border border-white/10 ring-1 ring-black/5 pointer-events-auto">
            {TABS.map((tab) => (
              <TabButton
                key={tab.id}
                icon={
                  <tab.icon
                    size={20}
                    strokeWidth={activeTab === tab.id ? 3 : 2}
                  />
                }
                label={tab.label}
                isActive={activeTab === tab.id}
                badge={tab.badge}
                onClick={() => {
                  triggerHaptic();
                  setActiveTab(tab.id);
                }}
              />
            ))}

            {installPrompt && activeTab === "inicio" && (
              <button
                onClick={() => {
                  triggerHaptic();
                  handleInstall();
                }}
                className="flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-2xl transition-all duration-300 bg-red-500 text-white shadow-md animate-pulse"
              >
                <Download size={20} strokeWidth={3} />
              </button>
            )}

            {/* iOS: botón manual de instalación */}
            {!installPrompt && showIOSButton && activeTab === "inicio" && (
              <button
                onClick={() => {
                  triggerHaptic();
                  setShowIOSInstall(true);
                }}
                className="flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-2xl transition-all duration-300 bg-red-500 text-white shadow-md animate-pulse"
              >
                <Download size={20} strokeWidth={3} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* iOS Install Instructions Modal */}
      {showIOSInstall && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-end justify-center p-0 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-t-[2rem] p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-200">
            <div className="flex justify-between items-start mb-5">
              <div>
                <h3 className="text-lg font-black text-slate-800 dark:text-white">Instalar App</h3>
                <p className="text-xs text-slate-400 mt-1">Sigue estos pasos en Safari</p>
              </div>
              <button onClick={() => { setShowIOSInstall(false); localStorage.setItem('ios_install_dismissed', '1'); }} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center shrink-0 text-blue-600 font-bold text-sm">1</div>
                <p className="text-sm text-slate-600 dark:text-slate-300">Toca el botón <strong>Compartir</strong> <span className="inline-block w-5 h-5 align-middle">⬆️</span> en la barra de Safari</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center shrink-0 text-blue-600 font-bold text-sm">2</div>
                <p className="text-sm text-slate-600 dark:text-slate-300">Busca y toca <strong>"Agregar a la pantalla de inicio"</strong></p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center shrink-0 text-red-600 font-bold text-sm">✓</div>
                <p className="text-sm text-slate-600 dark:text-slate-300">¡Listo! La app aparecerá como un ícono en tu teléfono</p>
              </div>
            </div>
            <button onClick={() => { setShowIOSInstall(false); localStorage.setItem('ios_install_dismissed', '1'); }} className="w-full mt-6 py-3 bg-red-500 text-white font-bold rounded-xl shadow-lg active:scale-95 transition-transform">
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Admin Panel Modal */}
      {showAdminPanel && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Key className="text-red-500" /> Admin Gen
              </h2>
              <button
                onClick={() => setShowAdminPanel(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGenerateCode}>
              <label className="block text-xs uppercase text-slate-500 font-bold mb-2">
                ID del Cliente
              </label>
              <input
                type="text"
                value={clientDeviceId}
                onChange={(e) => setClientDeviceId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-white mb-4 font-mono uppercase"
                placeholder="PDA-XXXX"
              />
              <button className="w-full bg-red-500 hover:bg-red-600 text-black font-bold py-3 rounded-lg mb-4">
                Generar Código
              </button>
            </form>

            <button
              onClick={() => {
                triggerHaptic();
                setShowTester(true);
                setShowAdminPanel(false);
              }}
              className="w-full bg-indigo-600/20 border border-indigo-500/50 text-indigo-400 font-bold py-2 rounded-lg text-xs uppercase tracking-tighter hover:bg-indigo-600/30 transition-colors"
            >
              🚀 Abrir Tester
            </button>

            {generatedCode && (
              <div className="mt-4 bg-green-900/30 border border-green-500/50 p-4 rounded-lg text-center">
                <p className="text-xs text-green-400 mb-1">Código Generado:</p>
                <p className="text-xl font-mono font-bold text-white tracking-widest selectable select-all">
                  {generatedCode}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({ icon, label, isActive, onClick, badge }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-2xl transition-all duration-300 ${isActive ? "bg-red-500 text-white shadow-md" : "text-slate-400 hover:text-white hover:bg-white/5"}`}
    >
      {icon}
      {badge > 0 && (
        <span className="absolute top-1 right-2 flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-slate-900 p-0.5 animate-pulse">
          {badge}
        </span>
      )}
      {isActive && (
        <span className="text-[9px] font-extrabold animate-in zoom-in duration-200">
          {label}
        </span>
      )}
    </button>
  );
}
