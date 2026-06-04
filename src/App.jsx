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
  Settings,
  Utensils,
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
const SettingsView = lazy(() => import("./views/SettingsView"));

import { useRates } from "./hooks/useRates";
import { useSecurity } from "./hooks/useSecurity";
import { useWebOrders } from "./hooks/useWebOrders";
import PremiumGuard from "./components/security/PremiumGuard";
import TermsOverlay from "./components/TermsOverlay";
import OnboardingOverlay from "./components/OnboardingOverlay";
import ErrorBoundary from "./components/ErrorBoundary";
import { useOfflineQueue } from "./hooks/useOfflineQueue";
import { useAutoBackup } from "./hooks/useAutoBackup";
import { useAutoLock } from "./hooks/useAutoLock";
import LockScreen from "./components/security/LockScreen";
import { useCloudAuth } from "./hooks/useCloudAuth";
import SystemStatusPill from "./components/security/SystemStatusPill";
import { CloudAuthModal } from "./components/security/CloudAuthModal";
import AdminPanelModal from "./components/security/AdminPanelModal";
import { useAuthStore } from "./hooks/store/useAuthStore";



export default function App() {
  const hasTablesSystem = localStorage.getItem("has_tables_system") !== "false";

  const [activeTab, setActiveTab] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const view = params.get("view");
      const validTabs = ["inicio", "ventas", "mesas", "cocina", "inbox", "catalogo", "clientes", "reportes"];
      if (view && validTabs.includes(view)) {
        if (view === "mesas" && !hasTablesSystem) return "ventas";
        return view;
      }
    } catch {
      // Ignorar errores en SSR o entornos sin window
    }
    return "inicio";
  });
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showIOSInstall, setShowIOSInstall] = useState(false);
  const [salesViewMode, setSalesViewMode] = useState("products");


  // Detectar iOS Safari (no standalone) para mostrar instrucciones manuales
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const showIOSButton = isIOS && !isStandalone && !localStorage.getItem('ios_install_dismissed');

  // Admin Panel States
  const [adminClicks, setAdminClicks] = useState(0);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showTester, setShowTester] = useState(false);


  const { rates, loading, isOffline, updateData } = useRates();
  const {
    generateCodeForClient,
    isPremium,
    isDemo,
    demoTimeLeft,
    demoExpiredMsg,
    dismissExpiredMsg,
    deviceId,
  } = useSecurity();
  const { isOnline, cacheRates } = useOfflineQueue();
  useAutoBackup();
  useAutoLock();
  const usuarioActivo = useAuthStore((s) => s.usuarioActivo);
  const isLocalCajero = usuarioActivo?.rol === "CAJERO";
  const isLocalMesero = usuarioActivo?.rol === "MESERO";
  const { cloudUser, role, isAdmin, isEmployee, isKitchen, loading: authLoading, isRecoveryFlow, setRecoveryFlow } = useCloudAuth();
  const storeConfig = { name: "PreciosAlDía Comida Rápida", whatsappNumber: "" }; // Will be populated from hook later


  // Global web orders hook for bottom nav badge
  const { orders: webOrders } = useWebOrders();
  const pendingWebCount = webOrders.filter(
    (o) => o.status === "pending",
  ).length;

  // Track pending checkout tables count for cashier notification badge
  const [checkoutTablesCount, setCheckoutTablesCount] = useState(0);

  useEffect(() => {
    const updateCount = () => {
      try {
        const raw = localStorage.getItem("bodega_open_tabs_v1");
        if (raw) {
          const tabs = JSON.parse(raw);
          if (Array.isArray(tabs)) {
            const count = tabs.filter((t) => t.status === "CHECKOUT").length;
            setCheckoutTablesCount(count);
            return;
          }
        }
      } catch (err) {
        console.error("Error reading open tabs:", err);
      }
      setCheckoutTablesCount(0);
    };

    updateCount();

    window.addEventListener("storage", updateCount);
    window.addEventListener("bodega_open_tabs_updated", updateCount);

    return () => {
      window.removeEventListener("storage", updateCount);
      window.removeEventListener("bodega_open_tabs_updated", updateCount);
    };
  }, []);

  // Cache rates whenever they update
  useEffect(() => {
    if (rates) cacheRates(rates);
  }, [rates, cacheRates]);

  // Redirección de roles ante cambios de activeTab
  useEffect(() => {
    if (isLocalMesero && activeTab !== "mesas") {
      setActiveTab("mesas");
      setSalesViewMode("tables");
    } else if (cloudUser) {
      if (isKitchen && activeTab !== "cocina") {
        setActiveTab("cocina");
      } else if ((isEmployee || isLocalCajero) && ["inicio", "reportes", "ajustes"].includes(activeTab)) {
        setActiveTab("ventas");
      }
    }
  }, [cloudUser, isKitchen, isEmployee, isLocalCajero, isLocalMesero, activeTab]);

  // Redirección si se deshabilita el módulo de mesas
  useEffect(() => {
    if (activeTab === "mesas" && !hasTablesSystem) {
      setActiveTab("ventas");
      setSalesViewMode("products");
    }
  }, [activeTab, hasTablesSystem]);

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
    { id: "mesas", label: "Mesas", icon: Utensils, badge: checkoutTablesCount },
    { id: "ventas", label: "Vender", icon: ShoppingCart },
    { id: "cocina", label: "Cocina", icon: Flame },
    {
      id: "inbox",
      label: "Pedidos",
      icon: BellRing,
      badge: pendingWebCount,
    },
    { id: "catalogo", label: "Menú", icon: Store },
    { id: "ajustes", label: "Ajustes", icon: Settings },
  ].filter(tab => {
    if (tab.id === "mesas" && !hasTablesSystem) return false;
    if (isLocalMesero) {
      return tab.id === "mesas"; // El mesero local solo ve la pestaña de mesas
    }
    if (!cloudUser) return true; // Modo local/offline sin roles
    if (isLocalCajero && ["inicio", "ajustes"].includes(tab.id)) return false; // El cajero local no ve dashboard ni ajustes
    if (isAdmin && !isLocalCajero) return true;    // Admin ve todo
    if (isEmployee || isLocalCajero) {
      return ["ventas", "mesas", "catalogo", "cocina", "inbox"].includes(tab.id); // Empleado o cajero local no ve config/admin
    }

    if (isKitchen) {
      return tab.id === "cocina"; // Cocinero solo ve pantalla de cocina
    }
    return true;
  });


  // ── Interceptor de sesión obligatoria (Auth Hard Gate) ──
  if (authLoading) {
    return (
      <div className="h-[100dvh] w-full bg-slate-50 dark:bg-black flex flex-col items-center justify-center gap-4 animate-in fade-in duration-300">
        <div className="w-10 h-10 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider">
          Verificando sesión en la nube...
        </span>
      </div>
    );
  }

  if (!cloudUser || isRecoveryFlow) {
    return <CloudAuthModal isOpen={true} isForceLogin={true} isRecoveryFlow={isRecoveryFlow} setRecoveryFlow={setRecoveryFlow} />;
  }

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

      {/* Barra superior de estado compacta y premium */}
      <div className="fixed top-3 right-3 z-[100]">
        <SystemStatusPill rates={rates} triggerHaptic={triggerHaptic} />
      </div>

      {/* Demo Banner (discreto — bottom, above nav) */}
      {isDemo && demoTimeLeft && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-4 fade-in duration-500 pointer-events-none">
          <div className="px-3 py-1.5 bg-slate-900/80 dark:bg-white/10 backdrop-blur-xl rounded-full border border-white/10 shadow-xl flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-sm shadow-red-500/50"></div>
            <p className="text-[10px] font-semibold text-white tracking-wide">
              Licencia:{" "}
              <span className="text-red-400 font-bold drop-shadow-sm">{demoTimeLeft}</span>
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
                const msg = `Hola! Quiero adquirir la licencia Premium de PreciosAlDía Comida Rápida. Acabo de terminar mi prueba gratuita.\n\nMi ID de Instalación es: ${deviceId}`;
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
        className={`flex-1 min-h-0 w-full max-w-md md:max-w-5xl lg:max-w-7xl xl:max-w-[1600px] mx-auto relative ${isKeyboardOpen ? "pb-4" : "pb-24"} flex flex-col overflow-y-auto`}
      >
        {/* Hidden Admin Trigger Area */}
        <div
          className="absolute top-0 left-0 w-20 h-20 z-50 cursor-pointer opacity-0"
          onClick={handleLogoClick}
          title="Ssshh..."
        ></div>

        {/* Eager views — always mounted, visibility toggled via CSS */}
        <div
          className={`flex-1 min-h-0 flex flex-col ${(activeTab === "ventas" || activeTab === "mesas") ? "" : "hidden"}`}
        >
          <ErrorBoundary>
            <PremiumGuard featureName="Punto de Venta" isShop={true}>
              <SalesView
                rates={rates}
                triggerHaptic={triggerHaptic}
                onNavigate={(tab) => {
                  setActiveTab(tab);
                  if (tab === "ventas") setSalesViewMode("products");
                  if (tab === "mesas") setSalesViewMode("tables");
                }}
                salesViewMode={salesViewMode}
                setSalesViewMode={setSalesViewMode}
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
                  <ProductsView rates={rates} triggerHaptic={triggerHaptic} onNavigate={setActiveTab} />
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
                    <InboxView rates={rates} storeConfig={storeConfig} onNavigate={setActiveTab} />
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
          {(activeTab === "ajustes" ||
            document.querySelector('[data-view="ajustes"]')) && (
              <div
                data-view="ajustes"
                className={`flex-1 flex flex-col ${activeTab === "ajustes" ? "" : "hidden"}`}
              >
                <ErrorBoundary>
                  <PremiumGuard featureName="Panel de Ajustes">
                    <SettingsView
                      rates={rates}
                      triggerHaptic={triggerHaptic}
                      onNavigate={setActiveTab}
                      theme={theme}
                      toggleTheme={toggleTheme}
                    />
                  </PremiumGuard>
                </ErrorBoundary>
              </div>
            )}
        </Suspense>
      </main>

      {/* Bottom Nav - Glass Dock */}
      {!isKeyboardOpen && (
        <div className="fixed bottom-0 left-0 right-0 px-6 pb-[env(safe-area-inset-bottom)] pt-0 mb-6 max-w-md md:max-w-xl mx-auto z-30 pointer-events-none animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-slate-900/80 dark:bg-slate-950/80 backdrop-blur-2xl rounded-[28px] p-2 flex justify-between items-center shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] border border-white/10 ring-1 ring-white/5 pointer-events-auto">
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
                  if (tab.id === "mesas") {
                    setActiveTab("mesas");
                    setSalesViewMode("tables");
                  } else if (tab.id === "ventas") {
                    setActiveTab("ventas");
                    setSalesViewMode("products");
                  } else {
                    setActiveTab(tab.id);
                  }
                }}

              />
            ))}

            {installPrompt && activeTab === "inicio" && (
              <button
                onClick={() => {
                  triggerHaptic();
                  handleInstall();
                }}
                className="flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-2xl transition-all duration-300 bg-brand text-white shadow-md animate-pulse"
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
                className="flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-2xl transition-all duration-300 bg-brand text-white shadow-md animate-pulse"
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
                <div className="w-8 h-8 bg-brand/10 dark:bg-brand/20 rounded-full flex items-center justify-center shrink-0 text-brand-dark dark:text-brand font-bold text-sm">✓</div>
                <p className="text-sm text-slate-600 dark:text-slate-300">¡Listo! La app aparecerá como un ícono en tu teléfono</p>
              </div>
            </div>
            <button onClick={() => { setShowIOSInstall(false); localStorage.setItem('ios_install_dismissed', '1'); }} className="w-full mt-6 py-3 bg-brand text-white font-bold rounded-xl shadow-lg active:scale-95 transition-transform">
              Entendido
            </button>
          </div>
        </div>
      )}

      <AdminPanelModal
        isOpen={showAdminPanel}
        onClose={() => setShowAdminPanel(false)}
        generateCodeForClient={generateCodeForClient}
        triggerHaptic={triggerHaptic}
        onOpenTester={() => setShowTester(true)}
      />
      {!usuarioActivo && <LockScreen />}
    </div>
  );
}

function TabButton({ icon, label, isActive, onClick, badge }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex-1 flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-2xl transition-all duration-300 ${isActive ? "bg-slate-800 text-brand shadow-[0_0_15px_rgba(var(--color-brand),0.2)]" : "text-slate-400 hover:text-white hover:bg-white/5"}`}
    >
      {icon}
      {badge > 0 && (
        <span className="absolute top-1 right-2 flex min-w-[20px] h-[20px] items-center justify-center rounded-full bg-gradient-to-tr from-red-600 to-orange-500 text-[10px] font-black text-white shadow-md ring-[2px] ring-slate-900/80 p-0.5 animate-bounce-slow">
          {badge}
        </span>
      )}
      {isActive && (
        <span className="text-[10px] font-black tracking-wide animate-in zoom-in duration-200">
          {label}
        </span>
      )}
      {!isActive && (
        <span className="text-[10px] font-medium tracking-wide opacity-0 absolute">
          {label}
        </span>
      )}
    </button>
  );
}
