import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { storageService } from "../utils/storageService";
import { showToast } from "../components/Toast";
import {
  BarChart3,
  TrendingUp,
  Package,
  AlertTriangle,
  DollarSign,
  ShoppingBag,
  Clock,
  ArrowUpRight,
  Trash2,
  ShoppingCart,
  Store,
  Users,
  Send,
  Ban,
  ChevronDown,
  ChevronUp,
  Moon,
  Sun,
  UserPlus,
  Phone,
  FileText,
  Recycle,
  Flame,
  X,
} from "lucide-react";
import { formatBs, formatVzlaPhone } from "../utils/calculatorUtils";
import {
  getPaymentLabel,
  getPaymentMethod,
  PAYMENT_ICONS,
} from "../config/paymentMethods";
import SalesHistory from "../components/Dashboard/SalesHistory";
import SalesChart from "../components/Dashboard/SalesChart";
import PeakHoursChart from "../components/Dashboard/PeakHoursChart";
import ConfirmModal from "../components/ConfirmModal";
import CashRegisterModal from "../components/Dashboard/CashRegisterModal";
import { generateTicketPDF } from "../utils/ticketGenerator";
import { generateDailyClosePDF } from "../utils/dailyCloseGenerator";
import { useNotifications } from "../hooks/useNotifications";
import AnimatedCounter from "../components/AnimatedCounter";
import DashboardEmptyState from "../components/Dashboard/DashboardEmptyState";
import DashboardStats from "../components/Dashboard/DashboardStats";
import PaymentBreakdown from "../components/Dashboard/PaymentBreakdown";
import LowStockAlert from "../components/Dashboard/LowStockAlert";
import TopProducts from "../components/Dashboard/TopProducts";

const SALES_KEY = "bodega_sales_v1";

export default function DashboardView({
  rates,
  triggerHaptic,
  onNavigate,
  theme,
  toggleTheme,
}) {
  const { notifyCierrePendiente, requestPermission } = useNotifications();
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [voidSaleTarget, setVoidSaleTarget] = useState(null);
  const [isResetTodayOpen, setIsResetTodayOpen] = useState(false);
  const [ticketPendingSale, setTicketPendingSale] = useState(null);
  const [ticketClientName, setTicketClientName] = useState("");
  const [ticketClientPhone, setTicketClientPhone] = useState("");
  const [recycleOffer, setRecycleOffer] = useState(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const scrollRef = useRef(null);

  const bcvRate = rates.bcv?.price || 0;
  const today = new Date().toISOString().split("T")[0];
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);

  // Function to reload data
  const loadData = useCallback(async () => {
    const [savedSales, savedProducts, savedCustomers, savedOrders] =
      await Promise.all([
        storageService.getItem(SALES_KEY, []),
        storageService.getItem("my_products_v1", []),
        storageService.getItem("bodega_customers_v1", []),
        storageService.getItem("kitchen_orders_v1", []),
      ]);

    setSales(savedSales);
    setProducts(savedProducts);
    setCustomers(savedCustomers);

    const active = savedOrders.filter(
      (o) => o.status === "PENDING" || o.status === "PREPARING",
    ).length;
    setActiveOrdersCount(active);
  }, []);

  useEffect(() => {
    let mounted = true;
    const initLoad = async () => {
      await loadData();
      if (mounted) setIsLoading(false);
    };
    initLoad();
    requestPermission();

    // Listen for storage events (Reactive Data)
    const handleStorageUpdate = (e) => {
      const keysWeCareAbout = [SALES_KEY, "my_products_v1", "bodega_customers_v1"];
      if (keysWeCareAbout.includes(e.detail.key)) {
        loadData();
      }
    };

    window.addEventListener("app_storage_update", handleStorageUpdate);

    return () => {
      mounted = false;
      window.removeEventListener("app_storage_update", handleStorageUpdate);
    };
  }, [loadData, requestPermission]);

  // ── Funciones de Historial Avanzado ──
  const handleVoidSale = async (sale) => {
    setVoidSaleTarget(sale);
  };

  const confirmVoidSale = async () => {
    const sale = voidSaleTarget;
    if (!sale) return;
    setVoidSaleTarget(null);

    try {
      // 1. Marcar venta como ANULADA
      const updatedSales = sales.map((s) => {
        if (s.id === sale.id) return { ...s, status: "ANULADA" };
        return s;
      });

      // 2. Revertir Stock
      const [savedProducts, savedCustomers] = await Promise.all([
        storageService.getItem("my_products_v1", []),
        storageService.getItem("my_customers_v1", []),
      ]);

      let updatedProducts = savedProducts;
      if (sale.items && sale.items.length > 0) {
        updatedProducts = savedProducts.map((p) => {
          const itemInSale = sale.items.find(
            (i) =>
              i.id === p.id ||
              i.id === p._originalId ||
              i.id === p.id + "_unit",
          );
          if (itemInSale) {
            return { ...p, stock: (p.stock || 0) + itemInSale.qty };
          }
          return p;
        });
      }

      // 3. Revertir Deuda/Saldo a Favor del Cliente
      let finalCustomers = savedCustomers;
      const fiadoAmountUsd = sale.fiadoUsd || 0;
      const favorUsed =
        sale.payments
          ?.filter((p) => p.methodId === "saldo_favor")
          .reduce((sum, p) => sum + p.amountUsd, 0) || 0;
      const debtIncurred = fiadoAmountUsd + favorUsed;

      if (sale.customerId && debtIncurred > 0) {
        finalCustomers = finalCustomers.map((c) => {
          if (c.id === sale.customerId) {
            return { ...c, deuda: c.deuda - debtIncurred };
          }
          return c;
        });
      }

      // 4. Guardar todo
      await storageService.setItem(SALES_KEY, updatedSales);
      await storageService.setItem("my_products_v1", updatedProducts);
      await storageService.setItem("my_customers_v1", finalCustomers);

      setSales(updatedSales);
      setProducts(updatedProducts); // actualizar kpi

      // Opcional: triggerHaptic()
      showToast("Venta anulada con éxito", "success");

      // Ofrecer reciclar la venta
      setRecycleOffer(sale);
    } catch (error) {
      console.error("Error anulando venta:", error);
      showToast("Hubo un problema anulando la venta", "error");
    }
  };

  const handleShareWhatsApp = (sale) => {
    let text = `*COMPROBANTE DE VENTA | PRECIOSALDÍA COMIDA RÁPIDA*\n`;
    text += `--------------------------------\n`;
    text += `*Orden:* #${sale.id.substring(0, 6).toUpperCase()}\n`;
    text += `Cliente: ${sale.customerName || "Consumidor Final"}\n`;
    text += `Fecha: ${new Date(sale.timestamp).toLocaleString("es-VE")}\n`;
    text += `===================================\n\n`;
    text += `*DETALLE DE PRODUCTOS:*\n`;

    if (sale.items && sale.items.length > 0) {
      sale.items.forEach((item) => {
        const qty = item.isWeight
          ? `${item.qty.toFixed(3)}Kg`
          : `${item.qty} Und`;
        text += `- ${item.name}\n  ${qty} x $${item.priceUsd.toFixed(2)} = *$${(item.priceUsd * item.qty).toFixed(2)}*\n`;
      });
      text += `\n===================================\n`;
    }

    text += `*TOTAL A PAGAR: $${(sale.totalUsd || 0).toFixed(2)}*\n`;
    text += ` Ref: ${formatBs(sale.totalBs || 0)} Bs a ${formatBs(sale.rate || bcvRate)} Bs/$\n`;

    if (sale.fiadoUsd > 0) {
      text += `\n*SALDO PENDIENTE (FIADO): $${sale.fiadoUsd.toFixed(2)}*\n`;
    }
    text += `\n===================================\n`;
    text += `*¡Gracias por su compra!*`;

    const encoded = encodeURIComponent(text);

    // Buscar el cliente de la venta para abrir WhatsApp directo a su número
    const saleCustomer = sale.customerId
      ? customers.find((c) => c.id === sale.customerId)
      : null;
    const phone = formatVzlaPhone(saleCustomer?.phone);
    const waUrl = phone
      ? `https://wa.me/${phone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    window.open(waUrl, "_blank");
  };

  const handleDownloadPDF = (sale) => {
    triggerHaptic();
    generateTicketPDF(sale, bcvRate);
  };

  // ── Registrar cliente para ticket ──
  const handleRegisterClientForTicket = async () => {
    if (!ticketClientName.trim() || !ticketPendingSale) return;

    // 1. Crear nuevo cliente
    const newCustomer = {
      id: crypto.randomUUID(),
      name: ticketClientName.trim(),
      phone: ticketClientPhone.trim() || "",
      deuda: 0,
      favor: 0,
      createdAt: new Date().toISOString(),
    };

    // 2. Guardar cliente en storage
    const updatedCustomers = [...customers, newCustomer];
    setCustomers(updatedCustomers);
    await storageService.setItem("my_customers_v1", updatedCustomers);

    // 3. Actualizar la venta con el cliente nuevo
    const updatedSale = {
      ...ticketPendingSale,
      customerId: newCustomer.id,
      customerName: newCustomer.name,
      customerPhone: newCustomer.phone,
    };
    const updatedSales = sales.map((s) =>
      s.id === updatedSale.id ? updatedSale : s,
    );
    setSales(updatedSales);
    await storageService.setItem(SALES_KEY, updatedSales);

    // 4. Cerrar modal y limpiar
    setTicketPendingSale(null);
    setTicketClientName("");
    setTicketClientPhone("");

    // 5. Enviar ticket por WhatsApp automáticamente
    handleShareWhatsApp(updatedSale);
  };

  // ── Métricas del Día (memoized) ──

  const todaySales = useMemo(
    () =>
      sales.filter(
        (s) =>
          s.timestamp?.startsWith(today) &&
          s.tipo !== "COBRO_DEUDA" &&
          s.status !== "ANULADA",
      ),
    [sales, today],
  );
  const todayTotalBs = useMemo(
    () => todaySales.reduce((sum, s) => sum + (s.totalBs || 0), 0),
    [todaySales],
  );
  const todayTotalUsd = useMemo(
    () => todaySales.reduce((sum, s) => sum + (s.totalUsd || 0), 0),
    [todaySales],
  );
  const todayItemsSold = useMemo(
    () =>
      todaySales.reduce(
        (sum, s) => sum + s.items.reduce((is, i) => is + i.qty, 0),
        0,
      ),
    [todaySales],
  );

  // Notificar cierre de caja pendiente (>7pm con ventas sin cerrar)
  useEffect(() => {
    if (todaySales.length > 0) notifyCierrePendiente(todaySales.length);
  }, [todaySales.length, notifyCierrePendiente]);

  const todayProfit = useMemo(
    () =>
      todaySales.reduce(
        (sum, s) =>
          sum +
          s.items.reduce((is, item) => {
            const costBs = item.costBs || 0;
            const saleBs = item.priceUsd * item.qty * (s.rate || bcvRate);
            return is + (saleBs - costBs * item.qty);
          }, 0),
        0,
      ),
    [todaySales, bcvRate],
  );

  // Últimas 7 ventas
  const recentSales = useMemo(() => sales.slice(0, 7), [sales]);

  // Datos últimos 7 días (para gráfica)
  const weekData = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const dateStr = d.toISOString().split("T")[0];
        const daySales = sales.filter(
          (s) =>
            s.timestamp?.startsWith(dateStr) &&
            s.tipo !== "COBRO_DEUDA" &&
            s.status !== "ANULADA",
        );
        return {
          date: dateStr,
          total: daySales.reduce((sum, s) => sum + (s.totalUsd || 0), 0),
          count: daySales.length,
        };
      }),
    [sales],
  );

  // Productos bajo stock
  const lowStockProducts = useMemo(
    () =>
      products
        .filter((p) => (p.stock ?? 0) <= (p.lowStockAlert ?? 5))
        .sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0))
        .slice(0, 6),
    [products],
  );

  // Top productos vendidos (todas las ventas netas)
  const topProducts = useMemo(() => {
    const productSalesMap = {};
    sales
      .filter((s) => s.tipo !== "COBRO_DEUDA" && s.status !== "ANULADA")
      .forEach((s) => {
        s.items.forEach((item) => {
          if (!productSalesMap[item.name])
            productSalesMap[item.name] = {
              name: item.name,
              qty: 0,
              revenue: 0,
            };
          productSalesMap[item.name].qty += item.qty;
          productSalesMap[item.name].revenue +=
            item.priceUsd * item.qty * (s.rate || bcvRate);
        });
      });
    return Object.values(productSalesMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [sales, bcvRate]);

  // Payment method breakdown (today)
  const paymentBreakdown = useMemo(() => {
    const allTodayTransactions = sales.filter(
      (s) => s.timestamp?.startsWith(today) && s.status !== "ANULADA",
    );
    return allTodayTransactions.reduce((acc, s) => {
      if (s.payments && s.payments.length > 0) {
        s.payments.forEach((p) => {
          if (!acc[p.methodId])
            acc[p.methodId] = { total: 0, currency: p.currency || "BS" };
          acc[p.methodId].total +=
            (p.currency === "USD" ? p.amountUsd : p.amountBs) || 0;
        });
      } else {
        const method = s.paymentMethod || "efectivo_bs";
        if (!acc[method]) acc[method] = { total: 0, currency: "BS" };
        acc[method].total += s.totalBs || 0;
      }
      return acc;
    }, {});
  }, [sales, today]);

  // Top productos vendidos HOY (para cierre del día)
  const todayTopProducts = useMemo(() => {
    const todayProductMap = {};
    todaySales.forEach((s) => {
      s.items.forEach((item) => {
        if (!todayProductMap[item.name])
          todayProductMap[item.name] = { name: item.name, qty: 0, revenue: 0 };
        todayProductMap[item.name].qty += item.qty;
        todayProductMap[item.name].revenue +=
          item.priceUsd * item.qty * (s.rate || bcvRate);
      });
    });
    return Object.values(todayProductMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);
  }, [todaySales, bcvRate]);

  // Handler: Cierre de Caja (abre modal de confirmación)
  const handleDailyClose = () => {
    triggerHaptic && triggerHaptic();
    if (todaySales.length === 0) {
      showToast("No hay ventas hoy para cerrar caja", "error");
      return;
    }
    setIsResetTodayOpen(true);
  };

  const handleResetToday = async () => {
    // 1. Generar PDF del cierre ANTES de borrar
    if (todaySales.length > 0) {
      const allTodayForReport = sales.filter((s) =>
        s.timestamp?.startsWith(today),
      );
      await generateDailyClosePDF({
        sales: todaySales,
        allSales: allTodayForReport,
        bcvRate,
        paymentBreakdown,
        topProducts: todayTopProducts,
        todayTotalUsd,
        todayTotalBs,
        todayProfit,
        todayItemsSold,
      });
    }
    // 2. Resetear ventas del día
    const remaining = sales.filter((s) => !s.timestamp?.startsWith(today));
    await storageService.setItem(SALES_KEY, remaining);
    setSales(remaining);
    setIsResetTodayOpen(false);
    showToast("Cierre de caja completado", "success");
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-3 sm:p-6 space-y-4">
        <div className="skeleton h-14 w-40" />
        <div className="grid grid-cols-3 gap-3">
          <div className="skeleton h-20" />
          <div className="skeleton h-20" />
          <div className="skeleton h-20" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="skeleton h-32" />
          <div className="skeleton h-32" />
        </div>
        <div className="skeleton h-48" />
        <div className="skeleton h-24" />
      </div>
    );
  }

  // Pull-to-refresh handlers
  const handleTouchStart = (e) => {
    if (scrollRef.current?.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  };
  const handleTouchMove = (e) => {
    if (scrollRef.current?.scrollTop > 0) return;
    const diff = e.touches[0].clientY - touchStartY.current;
    if (diff > 0) setPullDistance(Math.min(diff * 0.4, 80));
  };
  const handleTouchEnd = async () => {
    if (pullDistance > 60) {
      setIsRefreshing(true);
      const [savedSales, savedProducts, savedCustomers] = await Promise.all([
        storageService.getItem(SALES_KEY, []),
        storageService.getItem("my_products_v1", []),
        storageService.getItem("bodega_customers_v1", []),
        storageService.getItem("kitchen_orders_v1", []),
      ]);
      setSales(savedSales);
      setProducts(savedProducts);
      setCustomers(savedCustomers);

      const active = savedOrders.filter(
        (o) => o.status === "PENDING" || o.status === "PREPARING",
      ).length;
      setActiveOrdersCount(active);

      setIsRefreshing(false);
    }
    setPullDistance(0);
  };

  return (
    <div
      ref={scrollRef}
      className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 p-3 sm:p-6 pb-8 overflow-y-auto scrollbar-hide"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <div
          className="flex justify-center pb-3 transition-all"
          style={{ height: pullDistance > 0 ? pullDistance : 40 }}
        >
          <div
            className={`w-6 h-6 rounded-full border-2 border-slate-300 dark:border-slate-700 border-t-red-500 ${isRefreshing || pullDistance > 60 ? "animate-spin-slow" : ""}`}
            style={{
              opacity: Math.min(pullDistance / 60, 1),
              transform: `rotate(${pullDistance * 4}deg)`,
            }}
          />
        </div>
      )}

      <div className="flex items-center justify-between mb-4 pt-2">
        <div className="flex flex-col items-start gap-0.5">
          <img
            src={theme === "dark" ? "/logodark.png" : "/logoprincipal.png"}
            alt="PreciosAlDía Comida Rápida"
            className="h-14 w-auto object-contain drop-shadow-sm"
          />
          <div className="flex items-center gap-1.5 pl-3">
            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.18em] leading-none">
              Comida Rápida
            </span>
            <button
              onClick={() => {
                triggerHaptic();
                toggleTheme();
              }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-opacity active:scale-90 outline-none"
            >
              {theme === "dark" ? <Sun size={12} /> : <Moon size={12} />}
            </button>
          </div>
        </div>
      </div>

      {/* Acciones Rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <button
          onClick={() => {
            if (onNavigate) {
              triggerHaptic();
              onNavigate("ventas");
            }
          }}
          className="bg-red-500 text-white rounded-2xl p-3 flex flex-col items-center justify-center gap-2 shadow-sm hover:scale-[1.02] active:scale-95 transition-all"
        >
          <ShoppingCart size={22} />
          <span className="text-xs font-bold">Vender</span>
        </button>
        <button
          onClick={() => {
            if (onNavigate) {
              triggerHaptic();
              onNavigate("cocina");
            }
          }}
          className="bg-red-500 text-white rounded-2xl p-3 flex flex-col items-center justify-center gap-2 shadow-sm hover:scale-[1.02] active:scale-95 transition-all"
        >
          <Flame size={22} />
          <span className="text-xs font-bold">Cocina</span>
        </button>
        <button
          onClick={() => {
            if (onNavigate) {
              triggerHaptic();
              onNavigate("catalogo");
            }
          }}
          className="bg-indigo-500 text-white rounded-2xl p-3 flex flex-col items-center justify-center gap-2 shadow-sm hover:scale-[1.02] active:scale-95 transition-all"
        >
          <Store size={22} />
          <span className="text-xs font-bold">Menú</span>
        </button>
        <button
          onClick={() => {
            if (onNavigate) {
              triggerHaptic();
              onNavigate("reportes");
            }
          }}
          className="bg-slate-600 text-white rounded-2xl p-3 flex flex-col items-center justify-center gap-2 shadow-sm hover:scale-[1.02] active:scale-95 transition-all"
        >
          <BarChart3 size={22} />
          <span className="text-xs font-bold">Reportes</span>
        </button>
      </div>

      {/* ─── ONBOARDING RÁPIDO (ESTADO VACÍO GENERAL) ─── */}
      {sales.length === 0 && <DashboardEmptyState onNavigate={onNavigate} />}

      {/* Stats Cards */}
      <DashboardStats
        todayTotalUsd={todayTotalUsd}
        todayTotalBs={todayTotalBs}
        todaySalesLength={todaySales.length}
        todayItemsSold={todayItemsSold}
        todayProfit={todayProfit}
        bcvRate={bcvRate}
        handleDailyClose={handleDailyClose}
      />

      {/* Pago por Método */}
      <PaymentBreakdown
        paymentBreakdown={paymentBreakdown}
        todayTotalBs={todayTotalBs}
        bcvRate={bcvRate}
      />

      {/* Gráfica semanal */}
      <SalesChart weekData={weekData} onNavigate={onNavigate} bcvRate={bcvRate} />

      {/* Gráfica Horas Pico */}
      <PeakHoursChart sales={sales} />

      {/* Bajo Stock */}
      <LowStockAlert lowStockProducts={lowStockProducts} />

      {/* Top Productos */}
      <TopProducts topProducts={topProducts} />

      <SalesHistory
        recentSales={recentSales}
        bcvRate={bcvRate}
        totalSalesCount={sales.length}
        onVoidSale={handleVoidSale}
        onShareWhatsApp={handleShareWhatsApp}
        onDownloadPDF={handleDownloadPDF}
        onOpenDeleteModal={() => setIsDeleteModalOpen(true)}
        onRequestClientForTicket={(sale) => {
          triggerHaptic && triggerHaptic();
          setTicketPendingSale(sale);
        }}
        onRecycleSale={(sale) => {
          triggerHaptic && triggerHaptic();
          localStorage.setItem("recycled_cart", JSON.stringify(sale.items));
          if (onNavigate) onNavigate("ventas");
        }}
      />

      {/* Empty state */}
      {sales.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-300 dark:text-slate-700 py-10 space-y-3">
          <BarChart3 size={64} strokeWidth={1} />
          <p className="text-sm font-medium">Sin datos aún</p>
          <p className="text-xs text-slate-400">
            Las estadísticas aparecerán cuando hagas tu primera venta
          </p>
        </div>
      )}

      {/* Modal Registrar Cliente para Ticket */}
      {ticketPendingSale && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => {
            setTicketPendingSale(null);
            setTicketClientName("");
            setTicketClientPhone("");
          }}
        >
          <div
            className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5">
              <div className="flex justify-center mb-4">
                <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/30 text-red-500 rounded-full flex items-center justify-center">
                  <UserPlus size={28} />
                </div>
              </div>
              <h3 className="text-lg font-black text-center text-slate-900 dark:text-white mb-1">
                Registrar Cliente
              </h3>
              <p className="text-xs text-center text-slate-400 mb-5">
                Para enviar el ticket, registra los datos del cliente.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">
                    Nombre del Cliente *
                  </label>
                  <input
                    type="text"
                    value={ticketClientName}
                    onChange={(e) => setTicketClientName(e.target.value)}
                    placeholder="Ej: María García"
                    autoFocus
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 flex items-center gap-1">
                    <Phone size={10} /> Teléfono / WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={ticketClientPhone}
                    onChange={(e) => setTicketClientPhone(e.target.value)}
                    placeholder="Ej: 0414-1234567"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
                  />
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex gap-3">
              <button
                onClick={() => {
                  setTicketPendingSale(null);
                  setTicketClientName("");
                  setTicketClientPhone("");
                }}
                className="flex-1 py-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white font-bold rounded-xl active:scale-[0.98] transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleRegisterClientForTicket}
                disabled={!ticketClientName.trim()}
                className="flex-1 py-3 bg-red-500 disabled:bg-slate-300 dark:disabled:bg-slate-700 hover:bg-red-600 text-white font-bold rounded-xl active:scale-[0.98] transition-all flex justify-center items-center gap-2 shadow-md shadow-red-500/20"
              >
                <Send size={16} /> Registrar y Enviar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación Borrado Historial */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 text-red-500 rounded-full flex items-center justify-center mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">
                ¿Estás absolutamente seguro?
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 px-2">
                Esta acción borrará permanentemente{" "}
                <strong className="text-red-500">
                  TODO el historial de ventas
                </strong>
                . (No afectará tu menú de productos).
              </p>
              <div className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-6">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">
                  Escribe "BORRAR" para confirmar:
                </p>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="BORRAR"
                  className="w-full form-input bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 text-center font-black text-red-500 uppercase tracking-widest focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex gap-3">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeleteConfirmText("");
                }}
                className="flex-1 py-3.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white font-bold rounded-xl active:scale-[0.98] transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (deleteConfirmText.trim().toUpperCase() === "BORRAR") {
                    setSales([]);
                    storageService.removeItem("my_sales_v1");
                    setIsDeleteModalOpen(false);
                    setDeleteConfirmText("");
                  }
                }}
                disabled={deleteConfirmText.trim().toUpperCase() !== "BORRAR"}
                className="flex-1 py-3.5 bg-red-500 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-bold rounded-xl active:scale-[0.98] transition-all flex justify-center items-center gap-2"
              >
                <Trash2 size={18} /> Borrar Historial
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal: ¿Reciclar Venta? */}
      {recycleOffer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setRecycleOffer(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 text-center">
              <div className="flex justify-center mb-4">
                <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-500 rounded-full flex items-center justify-center">
                  <Recycle size={28} />
                </div>
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">
                Venta Anulada
              </h3>
              <p className="text-xs text-slate-400 mb-2">
                ¿Quieres reciclar los productos de esta venta y enviarlos a la
                caja?
              </p>
              <div className="text-left bg-slate-50 dark:bg-slate-800 rounded-xl p-3 mt-3 space-y-1">
                {recycleOffer.items?.slice(0, 5).map((item, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-300 font-medium">
                      {item.qty}
                      {item.isWeight ? "kg" : "u"}{" "}
                      {item.name.length > 20
                        ? item.name.substring(0, 20) + "…"
                        : item.name}
                    </span>
                    <span className="text-slate-400 font-bold">
                      ${(item.priceUsd * item.qty).toFixed(2)}
                    </span>
                  </div>
                ))}
                {recycleOffer.items?.length > 5 && (
                  <p className="text-[10px] text-slate-400 text-center">
                    +{recycleOffer.items.length - 5} más...
                  </p>
                )}
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex gap-3">
              <button
                onClick={() => setRecycleOffer(null)}
                className="flex-1 py-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white font-bold rounded-xl active:scale-[0.98] transition-all"
              >
                No, gracias
              </button>
              <button
                onClick={() => {
                  // Guardar items reciclados en localStorage como señal
                  localStorage.setItem(
                    "recycled_cart",
                    JSON.stringify(recycleOffer.items),
                  );
                  setRecycleOffer(null);
                  if (onNavigate) onNavigate("ventas");
                }}
                className="flex-1 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl active:scale-[0.98] transition-all flex justify-center items-center gap-2 shadow-md shadow-indigo-500/20"
              >
                <Recycle size={16} /> Reciclar
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!voidSaleTarget}
        onClose={() => setVoidSaleTarget(null)}
        onConfirm={confirmVoidSale}
        title={`Anular venta #${voidSaleTarget?.id?.substring(0, 6).toUpperCase() || ""}`}
        message={`Esta acción:\n• Marcará la venta como ANULADA\n• Revertirá deudas o saldos a favor\n\nEsta acción no se puede deshacer.`}
        confirmText="Sí, anular"
        variant="danger"
      />
      {/* Modal de Arqueo Diario */}
      <CashRegisterModal
        isOpen={isResetTodayOpen}
        onClose={() => setIsResetTodayOpen(false)}
        onConfirm={handleResetToday}
        paymentBreakdown={paymentBreakdown}
        todayTotalUsd={todayTotalUsd}
        todayTotalBs={todayTotalBs}
        todaySalesCount={todaySales.length}
        bcvRate={bcvRate}
      />
    </div>
  );
}
