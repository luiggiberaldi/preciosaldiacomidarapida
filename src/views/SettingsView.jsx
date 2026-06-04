import React, { useState, useRef, useEffect } from "react";
import {
  Upload,
  Download,
  AlertTriangle,
  Check,
  Database,
  Share2,
  Fingerprint,
  Copy,
  Truck,
  Wallet,
  Settings,
  LogOut,
  Lock,
  User,
  Shield,
  Printer,
  Globe,
  Utensils,
  Sun,
  Moon,
} from "lucide-react";
import { storageService } from "../utils/storageService";
import { showToast } from "../components/Toast";
import PaymentMethodsManager from "../components/Settings/PaymentMethodsManager";
import { webSupabase, getTenantId, generateProductId } from "../utils/supabase";
import { useSecurity } from "../hooks/useSecurity";
import PremiumGuard from "../components/security/PremiumGuard";
import { useCloudAuth } from "../hooks/useCloudAuth";
import { useAuthStore } from "../hooks/store/useAuthStore";

// Componentes modulares
import SecuritySettings from "../components/Settings/SecuritySettings";
import BackupSettings from "../components/Settings/BackupSettings";
import PrinterSettings from "../components/Settings/PrinterSettings";
import UsersSettings from "../components/Settings/UsersSettings";
import ShareInventoryModal from "../components/ShareInventoryModal";
import ConfirmModal from "../components/ConfirmModal";
import TablesSettings from "../components/Settings/TablesSettings";

export default function SettingsView({ rates, triggerHaptic, onNavigate, theme, toggleTheme }) {
  const [activeTab, setActiveTab] = useState("web_shop");
  const [importStatus, setImportStatus] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const fileInputRef = useRef(null);
  const { deviceId } = useSecurity();
  const { cloudUser, role: cloudRole, signOut: cloudSignOut } = useCloudAuth();
  const { usuarioActivo, logout: localLogout } = useAuthStore();
  const [idCopied, setIdCopied] = useState(false);
  const [hasDelivery, setHasDelivery] = useState(() => localStorage.getItem("has_delivery") !== "false");
  const [isSyncingDelivery, setIsSyncingDelivery] = useState(false);
  const [requiresPrepayment, setRequiresPrepayment] = useState(() => localStorage.getItem("requires_prepayment") === "true");
  const [isSyncingPrepayment, setIsSyncingPrepayment] = useState(false);
  const [showCloudLogoutConfirm, setShowCloudLogoutConfirm] = useState(false);
  const [showLocalLogoutConfirm, setShowLocalLogoutConfirm] = useState(false);

  // Estados locales para el modal de compartir
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [products, setProducts] = useState([]);

  // Cargar productos al montar para la función de compartir
  useEffect(() => {
    storageService.getItem("my_products_v1", []).then((loaded) => {
      setProducts(loaded || []);
    });
  }, []);

  const effectiveRate = rates?.bcv?.price || parseFloat(localStorage.getItem("street_rate_bs")) || 1;

  // --- SINCRONIZAR MENÚ WEB ---
  const autoSyncWebCatalog = async (updatedProducts) => {
    try {
      const tenantId = getTenantId();
      const activeProducts = updatedProducts
        .filter((p) => p.available !== false && p.publishWeb !== false)
        .map((p) => ({
          id: generateProductId(tenantId, p.id),
          local_id: String(p.id),
          tenant_id: tenantId,
          name: p.name,
          description: p.description || "",
          price_usd: parseFloat(p.priceUsdt || p.priceUsd || p.price || 0) || 0,
          category: p.category || "otros",
          image_url: p.image || "",
          is_available: true,
          prep_time: String([0, 5, 10, 15, 20, 30, 45, 60].includes(Number(p.prepTime)) ? Number(p.prepTime) : (p.prepTime === undefined ? 10 : 0)),
          sizes: p.sizes?.length > 0 ? [{ id: "base", name: p.baseSizeName || "Normal", price: parseFloat(p.priceUsdt || p.priceUsd || p.price || 0) || 0 }, ...p.sizes] : [],
          extras: p.extras || [],
          updated_at: new Date().toISOString(),
        }));

      // 1. Borrar todos los productos existentes en la web para este tenant
      await webSupabase
        .from("web_catalog")
        .delete()
        .eq("tenant_id", tenantId);

      // 2. Insertar los productos activos
      if (activeProducts.length > 0) {
        const { error } = await webSupabase
          .from("web_catalog")
          .upsert(activeProducts, { onConflict: "id" });
        if (error) console.warn("Auto-sync web_catalog:", error.message);
      }

      // 3. Actualizar la tasa de cambio en la web
      await webSupabase
        .from("web_config")
        .update({ exchange_rate: effectiveRate || 1 })
        .eq("tenant_id", tenantId);

    } catch (error) {
      console.error("Error auto-syncing web catalog:", error);
    }
  };

  // --- EXPORTAR BACKUP ---
  const handleExport = async () => {
    try {
      setImportStatus("loading");
      setStatusMessage("Generando backup...");

      const allProducts = await storageService.getItem("my_products_v1", []);
      const accounts = await storageService.getItem("my_accounts_v2", []);

      const backupData = {
        timestamp: new Date().toISOString(),
        version: "1.0",
        data: {
          my_products_v1: JSON.stringify(allProducts),
          my_accounts_v2: JSON.stringify(accounts),
          premium_token: localStorage.getItem("premium_token"),
          street_rate_bs: localStorage.getItem("street_rate_bs"),
          catalog_use_auto_usdt: localStorage.getItem("catalog_use_auto_usdt"),
          catalog_custom_usdt_price: localStorage.getItem("catalog_custom_usdt_price"),
          catalog_show_cash_price: localStorage.getItem("catalog_show_cash_price"),
          monitor_rates_v12: localStorage.getItem("monitor_rates_v12"),
        },
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup_tasasaldia_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatusMessage("Backup descargado.");
      setImportStatus("success");
      setTimeout(() => setImportStatus(null), 3000);
    } catch (error) {
      console.error(error);
      setStatusMessage("Error al generar backup.");
      setImportStatus("error");
    }
  };

  // --- TOGGLE DELIVERY ---
  const handleDeliveryToggle = async () => {
    if (triggerHaptic) triggerHaptic();
    const newValue = !hasDelivery;
    setHasDelivery(newValue);
    localStorage.setItem("has_delivery", String(newValue));

    setIsSyncingDelivery(true);
    try {
      const tenantId = getTenantId();
      const { error } = await webSupabase.from("web_config").update({ has_delivery: newValue }).eq("tenant_id", tenantId);
      if (error) throw error;
      showToast(newValue ? "Delivery activado en la web" : "Delivery oculto en la web", "info");
    } catch (e) {
      console.error("Error updating delivery status:", e);
      showToast("Error al sincronizar estado de delivery", "error");
    } finally {
      setIsSyncingDelivery(false);
    }
  };

  // --- TOGGLE PREPAYMENT ---
  const handlePrepaymentToggle = async () => {
    if (triggerHaptic) triggerHaptic();
    const newValue = !requiresPrepayment;
    setRequiresPrepayment(newValue);
    localStorage.setItem("requires_prepayment", String(newValue));

    setIsSyncingPrepayment(true);
    try {
      const tenantId = getTenantId();
      const { error } = await webSupabase.from("web_config").update({ requires_prepayment: newValue }).eq("tenant_id", tenantId);
      if (error) throw error;
      showToast(newValue ? "Pagos Digitales activados: Efectivo oculto en la web" : "Pagos Digitales desactivados: Efectivo visible", "info");
    } catch (e) {
      console.error("Error updating prepayment status:", e);
      showToast("Error al sincronizar estado de prepago", "error");
    } finally {
      setIsSyncingPrepayment(false);
    }
  };

  // --- IMPORTAR BACKUP ---
  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        setImportStatus("loading");
        setStatusMessage("Restaurando datos...");
        const json = JSON.parse(e.target.result);

        if (!json.data || (!json.data.my_products_v1 && !json.data.my_accounts_v2)) {
          throw new Error("Formato de archivo inválido.");
        }

        if (json.data.my_products_v1) {
          const importedProducts = typeof json.data.my_products_v1 === "string"
            ? JSON.parse(json.data.my_products_v1)
            : json.data.my_products_v1;
            
          await storageService.setItem("my_products_v1", importedProducts);
          
          try {
            await autoSyncWebCatalog(importedProducts);
          } catch (syncErr) {
            console.error("Error auto-syncing after import", syncErr);
          }
        }
        if (json.data.my_accounts_v2) {
          await storageService.setItem(
            "my_accounts_v2",
            typeof json.data.my_accounts_v2 === "string"
              ? JSON.parse(json.data.my_accounts_v2)
              : json.data.my_accounts_v2
          );
        }

        if (json.data.street_rate_bs) localStorage.setItem("street_rate_bs", json.data.street_rate_bs);
        if (json.data.catalog_use_auto_usdt) localStorage.setItem("catalog_use_auto_usdt", json.data.catalog_use_auto_usdt);
        if (json.data.catalog_custom_usdt_price) localStorage.setItem("catalog_custom_usdt_price", json.data.catalog_custom_usdt_price);
        if (json.data.catalog_show_cash_price) localStorage.setItem("catalog_show_cash_price", json.data.catalog_show_cash_price);
        if (json.data.monitor_rates_v12) localStorage.setItem("monitor_rates_v12", json.data.monitor_rates_v12);

        setImportStatus("success");
        setStatusMessage("Datos restaurados. Recargando...");
        setTimeout(() => window.location.reload(), 1500);
      } catch (error) {
        console.error(error);
        setImportStatus("error");
        setStatusMessage("Error: El archivo no es válido.");
      }
    };
    reader.readAsText(file);
  };

  // Listado de Tabs de Navegación
  const menuItems = [
    { id: "web_shop", label: "Catálogo Web", icon: Globe },
    { id: "payment_methods", label: "Métodos de Pago", icon: Wallet },
    { id: "tables", label: "Mesas / Distribución", icon: Utensils },
    { id: "users_security", label: "Seguridad y Usuarios", icon: Shield },
    { id: "backup_support", label: "Respaldos y Soporte", icon: Database },
    { id: "printer", label: "Impresora", icon: Printer },
  ];

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto p-4 md:p-6 space-y-6 animate-in fade-in duration-300">
      {/* Header Premium */}
      <div className="shrink-0 mb-3 bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3 leading-none">
            <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
              <Settings size={22} className="text-white animate-spin-slow" />
            </div>
            Ajustes del Sistema
          </h1>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 font-bold">
            Personaliza el funcionamiento del Punto de Venta, accesos de personal y canales de venta online.
          </p>
        </div>
      </div>

      {/* Grid de Navegación + Contenido */}
      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
        
        {/* Barra de Pestañas (Horizontal en móvil / Vertical en desktop) */}
        <div className="flex md:flex-col overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 gap-1.5 md:gap-1.5 snap-x scrollbar-none shrink-0">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (triggerHaptic) triggerHaptic();
                  setActiveTab(item.id);
                }}
                className={`flex items-center gap-2 px-4 py-3 md:py-3.5 text-xs font-black tracking-wide rounded-2xl transition-all whitespace-nowrap snap-align-center border md:border-l-4 md:border-t-0 md:border-r-0 md:border-b-0 ${
                  isActive
                    ? "bg-indigo-50/70 border-indigo-200 text-indigo-600 dark:bg-slate-800 dark:border-indigo-500 dark:text-indigo-400"
                    : "bg-white border-slate-100 hover:bg-slate-50 text-slate-500 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/50"
                }`}
              >
                <Icon size={16} className={isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"} />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Panel de Contenido Activo */}
        <div className="space-y-6">
          
          {/* TAB 1: CATÁLOGO WEB */}
          {activeTab === "web_shop" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Tienda Virtual & Web */}
              <PremiumGuard featureName="Delivery Web" hideLock={false}>
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-5">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                      <Truck size={16} className="text-indigo-500" />
                      Tienda Virtual & Web
                    </h3>
                    
                    {/* Botón Compartir Menú */}
                    <button
                      onClick={() => setIsShareOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/50 active:scale-95 transition-all text-xs font-bold"
                    >
                      <Share2 size={12} />
                      Compartir Menú
                    </button>
                  </div>

                  {/* Toggle Delivery */}
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/50 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl shrink-0">
                        <Truck size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Activar Delivery</p>
                        <p className="text-[9px] text-slate-400 mt-0.5 font-medium">Permite pedidos con envío a domicilio desde el catálogo web</p>
                      </div>
                    </div>

                    <button
                      onClick={handleDeliveryToggle}
                      disabled={isSyncingDelivery}
                      className={`relative w-11 h-6 rounded-full transition-colors duration-300 flex items-center px-1 shadow-inner disabled:opacity-50 ${
                        hasDelivery ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-300 flex items-center justify-center ${
                          hasDelivery ? "translate-x-5" : "translate-x-0"
                        }`}
                      >
                        {isSyncingDelivery && (
                          <div className="w-2.5 h-2.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                        )}
                      </div>
                    </button>
                  </div>

                  {/* Toggle Solo Pagos Digitales */}
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/50 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl shrink-0">
                        <Wallet size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Solo Pagos Digitales</p>
                        <p className="text-[9px] text-slate-400 mt-0.5 font-medium">Oculta efectivo y exige transferencias o pagos móviles</p>
                      </div>
                    </div>

                    <button
                      onClick={handlePrepaymentToggle}
                      disabled={isSyncingPrepayment}
                      className={`relative w-11 h-6 rounded-full transition-colors duration-300 flex items-center px-1 shadow-inner disabled:opacity-50 ${
                        requiresPrepayment ? "bg-blue-500" : "bg-slate-200 dark:bg-slate-700"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-300 flex items-center justify-center ${
                          requiresPrepayment ? "translate-x-5" : "translate-x-0"
                        }`}
                      >
                        {isSyncingPrepayment && (
                          <div className="w-2.5 h-2.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        )}
                      </div>
                    </button>
                  </div>
                </div>
              </PremiumGuard>

              {/* Perfil en la Nube */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Globe size={16} className="text-indigo-500" />
                  Perfil en la Nube
                </h3>

                {cloudUser ? (
                  <div className="flex items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800/30">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate" title={cloudUser.email}>
                        {cloudUser.email}
                      </p>
                      <div className="mt-1.5 flex gap-1.5">
                        <span className={`px-2 py-0.5 border rounded-full text-[8px] font-black uppercase tracking-wider bg-indigo-500/10 border-indigo-500/20 text-indigo-500`}>
                          {cloudRole || "Rol"}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (triggerHaptic) triggerHaptic();
                        setShowCloudLogoutConfirm(true);
                      }}
                      title="Cerrar sesión en la nube"
                      className="p-2.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl transition-colors active:scale-95 shrink-0"
                    >
                      <LogOut size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="p-5 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-center space-y-3">
                    <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                      No has conectado tu cuenta a la nube para la sincronización web.
                    </p>
                    <button
                      onClick={() => window.location.reload()}
                      className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl active:scale-95 transition-transform text-xs shadow-md shadow-indigo-600/10"
                    >
                      Conectar Nube
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: MÉTODOS DE PAGO */}
          {activeTab === "payment_methods" && (
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm animate-in fade-in duration-200">
              <PaymentMethodsManager triggerHaptic={triggerHaptic} />
            </div>
          )}

          {/* TAB 3: SEGURIDAD Y USUARIOS */}
          {activeTab === "users_security" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Sección de Gestión de Usuarios */}
              <UsersSettings />

              {/* Ajustes de PIN y Bloqueo */}
              <SecuritySettings onClose={() => {}} />

              {/* Operador Local Activo */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <User size={16} className="text-indigo-500" />
                  Operador Local Activo
                </h3>

                {usuarioActivo ? (
                  <div className="flex items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800/30">
                    <div>
                      <p className="text-xs font-black text-slate-700 dark:text-slate-200">
                        {usuarioActivo.nombre}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1 font-medium">
                        Acceso activo como operador de caja ({usuarioActivo.rol})
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        if (triggerHaptic) triggerHaptic();
                        setShowLocalLogoutConfirm(true);
                      }}
                      title="Bloquear pantalla / Cerrar sesión local"
                      className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-red-500 dark:hover:text-red-400 rounded-2xl transition-all active:scale-95 shrink-0 text-xs font-bold uppercase tracking-wider border border-slate-300/40 dark:border-slate-700"
                    >
                      <Lock size={13} />
                      Bloquear
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 leading-normal pl-1 italic">
                    Ningún cajero activo. Terminal bloqueada.
                  </p>
                )}
              </div>

              {/* Preferencia de Tema */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  {theme === "dark" ? <Sun size={16} className="text-indigo-500" /> : <Moon size={16} className="text-indigo-500" />}
                  Apariencia del Sistema
                </h3>
                
                <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/30 rounded-2xl">
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Modo Oscuro</p>
                    <p className="text-[9px] text-slate-400 mt-0.5 font-medium">Activa el modo nocturno para reducir la fatiga visual</p>
                  </div>
                  
                  <button
                    onClick={() => {
                      if (triggerHaptic) triggerHaptic();
                      if (toggleTheme) toggleTheme();
                    }}
                    className={`relative w-11 h-6 rounded-full transition-colors duration-300 flex items-center px-1 shadow-inner ${
                      theme === "dark" ? "bg-indigo-500" : "bg-slate-200 dark:bg-slate-700"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-300 flex items-center justify-center ${
                        theme === "dark" ? "translate-x-5" : "translate-x-0"
                      }`}
                    >
                      {theme === "dark" ? <Moon size={10} className="text-indigo-500" /> : <Sun size={10} className="text-amber-500" />}
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: RESPALDOS Y SOPORTE */}
          {activeTab === "backup_support" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Tarjeta de Importar/Exportar Backups */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Database size={16} className="text-indigo-500" />
                  Copias de Seguridad (Backup)
                </h3>

                <div className="p-3.5 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-2xl flex gap-3">
                  <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed font-medium">
                    Al importar un archivo de backup, todos los productos, cuentas y configuraciones locales actuales serán reemplazados. Asegúrate de respaldar previamente.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <button
                    onClick={handleExport}
                    className="flex items-center gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-[0.98] transition-all group"
                  >
                    <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl group-hover:bg-blue-500/20 transition-colors">
                      <Download size={18} />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Exportar Backup</p>
                      <p className="text-[9px] text-slate-400 mt-0.5 font-medium">Archivo local .json</p>
                    </div>
                  </button>

                  <button
                    onClick={handleImportClick}
                    className="flex items-center gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-[0.98] transition-all group"
                  >
                    <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl group-hover:bg-amber-500/20 transition-colors">
                      <Upload size={18} />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Importar Backup</p>
                      <p className="text-[9px] text-slate-400 mt-0.5 font-medium">Restaurar .json</p>
                    </div>
                  </button>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".json"
                  className="hidden"
                />

                {importStatus && (
                  <div
                    className={`p-3 rounded-2xl text-xs font-bold text-center flex items-center justify-center gap-2 ${
                      importStatus === "success"
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400"
                        : "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400"
                    }`}
                  >
                    {importStatus === "success" ? <Check size={14} /> : <AlertTriangle size={14} />}
                    {statusMessage}
                  </div>
                )}
              </div>

              {/* Backup Automático */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
                <BackupSettings />
              </div>

              {/* Soporte Técnico */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Fingerprint size={16} className="text-indigo-500" />
                  Soporte Técnico
                </h3>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/50 rounded-2xl flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400">ID de Instalación</p>
                    <p className="font-mono text-sm font-black text-slate-700 dark:text-slate-200 mt-1 select-all">
                      {deviceId || "..."}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(deviceId).then(() => {
                        setIdCopied(true);
                        setTimeout(() => setIdCopied(false), 2000);
                      });
                    }}
                    className="p-2.5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:text-indigo-500 dark:hover:text-indigo-400 rounded-xl transition-all shadow-sm active:scale-95"
                  >
                    {idCopied ? <Check size={16} className="text-emerald-500 animate-in zoom-in" /> : <Copy size={16} />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                  Comparte este identificador único con el desarrollador si necesitas registrar una licencia Premium o resolver incidencias del POS.
                </p>
              </div>

            </div>
          )}

          {/* TAB 5: IMPRESORA */}
          {activeTab === "printer" && (
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm animate-in fade-in duration-200">
              <PrinterSettings />
            </div>
          )}

          {/* TAB 6: CONFIGURACIÓN DE MESAS */}
          {activeTab === "tables" && (
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm animate-in fade-in duration-200">
              <TablesSettings triggerHaptic={triggerHaptic} />
            </div>
          )}

        </div>

      </div>

      {/* Modal de Compartir Catálogo/Menú */}
      <ShareInventoryModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        products={products}
        onImport={(imported) => {
          const publishedImport = imported.map((p) => ({
            ...p,
            publishWeb: true,
            available: true,
          }));
          setProducts(publishedImport);
          storageService.setItem("my_products_v1", publishedImport);
          showToast("Productos importados y guardados con éxito", "success");
          setTimeout(() => {
            autoSyncWebCatalog(publishedImport);
          }, 500);
        }}
      />

      {/* ConfirmModal para cerrar sesión en la nube */}
      <ConfirmModal
        isOpen={showCloudLogoutConfirm}
        onClose={() => setShowCloudLogoutConfirm(false)}
        onConfirm={async () => {
          try {
            await cloudSignOut();
            showToast("Sesión cerrada en la nube", "info");
          } catch (err) {
            showToast("Error al cerrar sesión", "error");
          }
        }}
        title="¿Cerrar Sesión en la Nube?"
        message="¿Seguro que deseas cerrar sesión en la nube?"
        confirmText="Sí, cerrar sesión"
        variant="danger"
      />

      {/* ConfirmModal para bloquear pantalla local */}
      <ConfirmModal
        isOpen={showLocalLogoutConfirm}
        onClose={() => setShowLocalLogoutConfirm(false)}
        onConfirm={localLogout}
        title="¿Bloquear Terminal?"
        message={usuarioActivo ? `¿Cerrar sesión de ${usuarioActivo.nombre} y bloquear pantalla?` : ""}
        confirmText="Sí, bloquear"
        variant="warning"
      />
    </div>
  );
}
