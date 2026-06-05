import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { ShoppingCart, X } from "lucide-react";
import { storageService } from "../utils/storageService";
import { webSupabase } from "../utils/supabase";
import { useSounds } from "../hooks/useSounds";
import { useVoiceSearch } from "../hooks/useVoiceSearch";
import { useNotifications } from "../hooks/useNotifications";
import { useOpenTabs } from "../hooks/useOpenTabs";
import { getActivePaymentMethods } from "../config/paymentMethods";
import { showToast } from "../components/Toast";
import { useAudit } from "../hooks/useAudit";
import { usePrinter } from "../hooks/usePrinter";
import { useOfflineQueue } from "../hooks/useOfflineQueue";
import { DEFAULT_TABLES } from "../config/tablesConfig";
import TablesFloorPlan from "../components/Sales/TablesFloorPlan";
import TableDetailsModal from "../components/Sales/TableDetailsModal";
import OpenTableModal from "../components/Sales/OpenTableModal";
import { useAuthStore } from "../hooks/store/useAuthStore";
import TableQueuePanel from "../components/Sales/TableQueuePanel";
import TableBillModal from "../components/Sales/TableBillModal";


// Components
import SalesHeader from "../components/Sales/SalesHeader";
import SearchBar from "../components/Sales/SearchBar";
import CategoryBar from "../components/Sales/CategoryBar";
import OpenTabsPanel from "../components/Sales/OpenTabsPanel";
import CartPanel from "../components/Sales/CartPanel";
import ProductOptionsModal from "../components/Sales/ProductOptionsModal";
import ReceiptModal from "../components/Sales/ReceiptModal";
import CheckoutModal from "../components/Sales/CheckoutModal";
import MiniNav from "../components/Sales/MiniNav";
import NoteModifierModal from "../components/Sales/NoteModifierModal";
import ConfirmModal from "../components/ConfirmModal";
import Confetti from "../components/Confetti";
import { buildReceiptWhatsAppUrl } from "../components/Sales/ReceiptShareHelper";
import { procesarImpactoCliente } from "../utils/financialLogic";

const SALES_KEY = "bodega_sales_v1";

export default function SalesView({ rates, triggerHaptic, onNavigate, salesViewMode, setSalesViewMode }) {
  const { playAdd, playRemove, playCheckout, playError } = useSounds();
  const { notifySaleComplete, notifyLowStock, notifyMesaCobrar } = useNotifications();
  const { logAction } = useAudit();
  const { isConnected: printerConnected, printTicket, printKitchen, printPrecuenta } = usePrinter();
  const { addToQueue } = useOfflineQueue();
  const usuarioActivo = useAuthStore((s) => s.usuarioActivo);


  // ── State ──────────────────────────────────────
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showClearCartConfirm, setShowClearCartConfirm] = useState(false);
  const [isCartSheetOpen, setIsCartSheetOpen] = useState(false);

  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem("pending_cart");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Open Tabs
  const { openTabs, addTab, removeTab, updateTab } = useOpenTabs();
  const [activeTabId, setActiveTabId] = useState(null);
  const [selectedTableForDetails, setSelectedTableForDetails] = useState(null);
  const [tableToReleasePending, setTableToReleasePending] = useState(null);
  const [tableForOpenModal, setTableForOpenModal] = useState(null);



  // Tables State
  const [tables, setTables] = useState(() => {
    try {
      const saved = localStorage.getItem("bodega_tables_v1");
      return saved ? JSON.parse(saved) : DEFAULT_TABLES;
    } catch {
      return DEFAULT_TABLES;
    }
  });

  // Save tables changes to localStorage
  useEffect(() => {
    localStorage.setItem("bodega_tables_v1", JSON.stringify(tables));
  }, [tables]);

  // Sync tables from localStorage when view mode changes (stale state prevention)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("bodega_tables_v1");
      if (saved) {
        setTables(JSON.parse(saved));
      }
    } catch (e) {
      console.error("[SalesView] Error loading tables from localStorage:", e);
    }
  }, [salesViewMode]);

  // Search
  const searchInputRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState("todos");

  // Modals
  const [showCheckout, setShowCheckout] = useState(false);
  const [showReceipt, setShowReceipt] = useState(null);
  const [selectedProductForOptions, setSelectedProductForOptions] = useState(null);
  const [hierarchyPending, setHierarchyPending] = useState(null);
  const [weightPending, setWeightPending] = useState(null);
  const [notePending, setNotePending] = useState(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [editingCartId, setEditingCartId] = useState(null);
  const [cartCustomerName, setCartCustomerName] = useState("");
  const [pendingWebOrderId, setPendingWebOrderId] = useState(null);
  const [tableCheckoutData, setTableCheckoutData] = useState(null);
  const [showTableBillModal, setShowTableBillModal] = useState(false);
  const [activeTableDiscount, setActiveTableDiscount] = useState({ type: "percentage", value: 0 });

  // Rate config
  const [showRateConfig, setShowRateConfig] = useState(false);
  const [useAutoRate, setUseAutoRate] = useState(() => {
    const saved = localStorage.getItem("bodega_use_auto_rate");
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [customRate, setCustomRate] = useState(() => {
    const saved = localStorage.getItem("bodega_custom_rate");
    return saved && parseFloat(saved) > 0 ? saved : "";
  });
  const [autoRateSource, setAutoRateSource] = useState(() => {
    const saved = localStorage.getItem("bodega_auto_rate_source");
    return saved !== null ? saved : "dolar";
  });

  const bcvRate = rates.bcv?.price || 0;
  const euroRate = rates.euro?.price || 0;
  const activeAutoRate = autoRateSource === "euro" ? euroRate : bcvRate;

  const effectiveRate = useAutoRate
    ? activeAutoRate
    : parseFloat(customRate) > 0
      ? parseFloat(customRate)
      : activeAutoRate;

  // Voice
  const handleSetSearchTerm = (text) => {
    setSearchTerm(text);
    setSelectedIndex(0);
  };
  const { isRecording, isProcessingAudio, toggleRecording } = useVoiceSearch({
    onResult: (text) => {
      handleSetSearchTerm(text);
      searchInputRef.current?.focus();
    },
    triggerHaptic,
  });

  // ── Derived (memos) ───────────────────────────
  const searchResults = useMemo(
    () =>
      searchTerm.length >= 1
        ? products
          .filter(
            (p) =>
              p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              p.barcode?.includes(searchTerm),
          )
          .slice(0, 6)
        : [],
    [searchTerm, products],
  );

  const filteredByCategory = useMemo(
    () =>
      selectedCategory === "todos"
        ? products
        : products.filter((p) => p.category === selectedCategory),
    [selectedCategory, products],
  );

  const cartTotalUsd = cart.reduce(
    (sum, item) => sum + item.priceUsd * item.qty,
    0,
  );
  const cartTotalBs = cartTotalUsd * effectiveRate;
  const cartItemCount = cart.reduce((sum, item) => sum + item.qty, 0);

  const discountAmountUsd = useMemo(() => {
    if (!tableCheckoutData || !activeTableDiscount || activeTableDiscount.value <= 0) return 0;
    const subtotal = tableCheckoutData.tab.items.reduce(
      (sum, item) => sum + (item.priceUsdt || item.priceUsd || item.price || 0) * item.qty,
      0
    );
    return activeTableDiscount.type === "percentage"
      ? subtotal * (activeTableDiscount.value / 100)
      : Math.min(activeTableDiscount.value, subtotal);
  }, [tableCheckoutData, activeTableDiscount]);

  const finalTotalUsd = tableCheckoutData ? Math.max(0, cartTotalUsd - discountAmountUsd) : cartTotalUsd;
  const finalTotalBs = finalTotalUsd * effectiveRate;

  const formatBs = (n) =>
    new Intl.NumberFormat("es-VE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);

  // ── Effects ───────────────────────────────────
  // Persist rate config
  useEffect(() => {
    localStorage.setItem("bodega_use_auto_rate", JSON.stringify(useAutoRate));
    localStorage.setItem("bodega_custom_rate", customRate.toString());
    localStorage.setItem("bodega_auto_rate_source", autoRateSource);
  }, [useAutoRate, customRate, autoRateSource]);

  // Persist cart
  useEffect(() => {
    if (cart.length > 0)
      localStorage.setItem("pending_cart", JSON.stringify(cart));
    else localStorage.removeItem("pending_cart");
  }, [cart]);

  // Load data
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const [saved, savedCustomers, methods] = await Promise.all([
        storageService.getItem("my_products_v1", []),
        storageService.getItem("my_customers_v1", []),
        getActivePaymentMethods(),
      ]);
      if (mounted) {
        setProducts(saved);
        setCustomers(savedCustomers);
        setPaymentMethods(methods);
        setIsLoading(false);

        const recycled = localStorage.getItem("recycled_cart");
        if (recycled) {
          try {
            const items = JSON.parse(recycled);
            if (Array.isArray(items) && items.length > 0) {
              setCart(
                items.map((item) => ({
                  id: item.id,
                  name: item.name,
                  qty: item.qty,
                  priceUsd: item.priceUsd,
                  costBs: item.costBs || 0,
                  isWeight: item.isWeight || false,
                })),
              );
            }
          } catch (_) {
            /* ignore */
          }
          localStorage.removeItem("recycled_cart");
        }
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  // Auto-focus search
  useEffect(() => {
    if (!isLoading && searchInputRef.current) searchInputRef.current.focus();
  }, [isLoading]);

  // Refresh products on window focus
  useEffect(() => {
    const handleFocus = async () => {
      setProducts(await storageService.getItem("my_products_v1", []));
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  // Return focus after closing modals
  useEffect(() => {
    if (!showCheckout && !showReceipt && searchInputRef.current)
      searchInputRef.current.focus();
  }, [showCheckout, showReceipt]);

  // Handle cart injection from other views (e.g. 1-Click Reorder in CustomersView or Web Orders)
  useEffect(() => {
    const handleInjectCart = (e) => {
      if (e.detail) {
        if (Array.isArray(e.detail)) {
          setCart(e.detail);
        } else if (e.detail.items && Array.isArray(e.detail.items)) {
          setCart(e.detail.items);
          if (e.detail.webOrderId) {
            setPendingWebOrderId(e.detail.webOrderId);
            if (e.detail.clientName) setCartCustomerName(e.detail.clientName);
            if (e.detail.action === "checkout") {
              setShowCheckout(true);
            }
          }
        }
        playAdd();
      }
    };
    window.addEventListener("inject_cart", handleInjectCart);
    return () => window.removeEventListener("inject_cart", handleInjectCart);
  }, [playAdd]);

  // Global keybinds (F9 = checkout, Escape = close modals)
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "F9") {
        e.preventDefault();
        if (cart.length > 0 && !showCheckout && !showReceipt)
          setShowCheckout(true);
      }
      if (e.key === "Escape") {
        if (showCheckout) {
          setShowCheckout(false);
          setSelectedCustomerId("");
        }
        if (showReceipt) {
          setShowReceipt(null);
          setSelectedCustomerId("");
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [cart, showCheckout, showReceipt]);

  // ── Callbacks ─────────────────────────────────
  const addToCart = useCallback(
    (product, qtyOverride = null, forceMode = null, size = "", selectedExtras = [], customNote = "") => {
      triggerHaptic && triggerHaptic();

      // Verificar si el producto tiene opciones configuradas que requieran del Modal
      // Si el evento addToCart viene DEL modal, size o selectedExtras vendrán definidos (o entra forzado).
      // Si ambos están vacíos (no lo mandó el modal), procedemos a interceptar:
      const hasComplexOptions = product?.sizes?.length > 0 || product?.extras?.length > 0;
      if (hasComplexOptions && !size && selectedExtras.length === 0 && !forceMode) {
        // En lugar de añadir directo, abrimos el modal
        setSelectedProductForOptions(product);
        return;
      }

      playAdd();

      // Old logic for unit/weight products
      if (
        product.sellByUnit &&
        product.unitPriceUsd &&
        !forceMode &&
        !qtyOverride
      ) {
        setHierarchyPending(product);
        return;
      }
      if ((product.unit === "kg" || product.unit === "litro") && !qtyOverride) {
        setWeightPending(product);
        return;
      }

      const itemQty = qtyOverride !== null ? qtyOverride : 1;

      const extrasKey = selectedExtras
        .map((e) => e.name)
        .sort()
        .join("|");

      // Para productos complejos generamos un ID unico uniendo ID real + el tamaño seleccionado + extras + nota
      // (si piden 2 hamburguesas de dif tamaño o extras, son items separados en carrito)
      const uniqueId = `${product.id}_${size || 'base'}_${extrasKey || 'noext'}_${customNote.replace(/\s+/g, '') || 'nonote'}`;

      let priceToUse = product.priceUsdt;
      let cartId = product.id;
      let cartName = product.name;

      if (forceMode === "unit") {
        priceToUse = product.unitPriceUsd;
        cartId = product.id + "_unit";
        cartName = product.name + " (Ud.)";
      }

      setCart((prev) => {
        const existingIndex = prev.findIndex((i) => i.cartId === uniqueId);

        if (existingIndex >= 0 && !qtyOverride) {
          const newCart = [...prev];
          newCart[existingIndex] = {
            ...newCart[existingIndex],
            qty: newCart[existingIndex].qty + 1,
          };
          return newCart;
        }

        if (existingIndex >= 0 && qtyOverride) {
          const newCart = [...prev];
          newCart[existingIndex] = {
            ...newCart[existingIndex],
            qty: newCart[existingIndex].qty + qtyOverride,
          };
          return newCart;
        }

        return [
          {
            ...product,
            id: product.id, // Keep original product ID
            cartId: uniqueId, // Unique ID for cart item
            qty: itemQty,
            size: size || null,
            selectedExtras: selectedExtras,
            note: customNote || "",
            isWeight: false,
            // Forzamos que si tiene size o extras se sobreescriba el precio
            // La UI del modal ya calcula internamente los totals, pero aquí el POS
            // recalcula TODO basado en `priceUsd`
            priceUsd: product.priceUsdt || product.priceUsd || product.price || 0, // Fallback, el modal te lo dará calculado abajo si quieres.
          },
          ...prev,
        ];
      });
      handleSetSearchTerm("");
      setHierarchyPending(null);
      searchInputRef.current?.focus();
    },
    [triggerHaptic, effectiveRate, playAdd],
  );

  const handleAddToCartWithOptions = (product, qty, size, selectedExtras, note) => {
    // Calculamos el precio base correcto según si eligió tamaño:
    const combinedSizes = product?.sizes?.length > 0 ? [
      {
        name: product.baseSizeName || "Normal",
        price: parseFloat(product.priceUsdt || product.priceUsd || product.price || 0)
      },
      ...product.sizes
    ] : [];

    const basePrice = parseFloat(product.priceUsdt || product.priceUsd || product.price || 0);
    const sizeObj = combinedSizes.find((s) => s.name === size);
    const finalBasePrice = sizeObj ? parseFloat(sizeObj.priceUsdt || sizeObj.priceUsd || sizeObj.price) : basePrice;

    // Sumamos los extras
    const extrasTotal = selectedExtras.reduce((sum, extra) => {
      return sum + parseFloat(extra.priceUsdt || extra.priceUsd || extra.price || 0);
    }, 0);

    const fullUnitPrice = finalBasePrice + extrasTotal;

    // Hacemos deep clone del producto y le sobreescribimos el precio para que cart-panel no sufra
    const customizedProduct = {
      ...product,
      priceUsdt: fullUnitPrice,
      priceUsd: fullUnitPrice,
      price: fullUnitPrice
    };

    addToCart(customizedProduct, qty, "from_modal", size, selectedExtras, note);
  };

  const updateQty = (id, delta) => {
    triggerHaptic && triggerHaptic();
    if (delta < 0) playRemove();
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.cartId !== id && i.id !== id) return i; // Support either ID type
          let newQty = Math.round((i.qty + delta) * 1000) / 1000;
          if (newQty < 0) newQty = 0;
          return newQty === 0 ? null : { ...i, qty: newQty };
        })
        .filter(Boolean),
    );
    searchInputRef.current?.focus();
  };

  const removeFromCart = (id) => {
    triggerHaptic && triggerHaptic();
    playRemove();
    setCart((prev) => prev.filter((i) => i.cartId !== id && i.id !== id));
    searchInputRef.current?.focus();
  };

  const updateItemNote = (id, note) => {
    setCart((prev) => prev.map((i) => (i.cartId === id || i.id === id ? { ...i, note } : i)));
    setNotePending(null);
    searchInputRef.current?.focus();
  };

  const handleOpenTab = (customerName) => {
    if (cart.length === 0) return;
    triggerHaptic && triggerHaptic();

    if (activeTabId) {
      updateTab(activeTabId, cart);
      showToast(`Cuenta actualizada: ${customerName || activeTabId}`, "success");

      // Redirect table orders to the floor plan view
      const tab = openTabs.find((t) => t.id === activeTabId);
      if (tab && tab.customerInfo?.tableId) {
        onNavigate("mesas");
        setSalesViewMode("tables");
      }
    } else {
      const tabName = customerName || `Mesa/Cuenta #${openTabs.length + 1}`;
      
      // Auto-detect table link by name
      const matchedTable = tables.find((t) => t.name.toLowerCase() === tabName.toLowerCase());
      addTab(tabName, cart, matchedTable ? { tableId: matchedTable.id } : null);
      showToast(`Cuenta guardada: ${tabName}`, "success");

      if (matchedTable) {
        onNavigate("mesas");
        setSalesViewMode("tables");
      }
    }

    setCart([]);
    setCartCustomerName("");
    setActiveTabId(null);
  };


  const handleSelectOpenTab = (tab) => {
    // Si la caja actual tiene cosas sin guardar, habría que avisar, pero por ahora asumimos que 
    // lo cargan de golpe (para evitar perder items, si hay carrito lo tiramos a guardar primero o lo borramos).
    // Implementación robusta: reescribimos `cart` y guardamos su ID
    setCart(tab.items);
    setCartCustomerName(tab.name || "");
    setActiveTabId(tab.id);
  };

  const handleRemoveOpenTab = (tabId) => {
    removeTab(tabId);
    showToast("Cuenta eliminada permanentemente.", "error");
  };

  // Table selection & edit actions
  const handleSelectTable = (table, isOccupied) => {
    if (isOccupied) {
      setSelectedTableForDetails(table);
    } else {
      // Free table -> Open table opening wizard modal
      setTableForOpenModal(table);
    }
  };

  const handleConfirmOpenTable = ({ guests, clientName, notes }) => {
    if (!tableForOpenModal) return;
    const { usuarioActivo } = useAuthStore.getState();
    const activeWaiter = usuarioActivo?.nombre || "Cajero";

    addTab(clientName, [], {
      tableId: tableForOpenModal.id,
      waiter: activeWaiter,
      guests: guests,
      notes: notes,
    });

    showToast(`Mesa ${tableForOpenModal.name} abierta con éxito.`, "success");
    setTableForOpenModal(null);
  };

  const handleAddTable = (newTable) => {
    setTables((prev) => [...prev, newTable]);
    showToast(`Mesa "${newTable.name}" agregada con éxito.`, "success");
  };

  const handleRemoveTable = (tableId) => {
    const tableObj = tables.find((t) => t.id === tableId);
    setTables((prev) => prev.filter((t) => t.id !== tableId));
    showToast(`Mesa "${tableObj?.name || 'Mesa'}" eliminada.`, "error");
  };

  // Table Details Modal Callbacks
  const handleDetailsAddProducts = (table, tab) => {
    handleSelectOpenTab(tab);
    onNavigate("ventas");
    setSalesViewMode("products");
    setSelectedTableForDetails(null);
  };

  const handleDetailsCheckout = (table, tab) => {
    setTableCheckoutData({ table, tab });
    setShowTableBillModal(true);
    setSelectedTableForDetails(null);
  };

  const handleDetailsReleaseTable = (table, tab) => {
    setTableToReleasePending({ table, tab });
  };

  const handleSendToCashier = (table, tab) => {
    if (!tab) return;
    const totalUsd = tab.items.reduce(
      (s, i) => s + (i.priceUsdt || i.priceUsd || i.price || 0) * i.qty,
      0
    );
    updateTab(tab.id, tab.items, { status: "CHECKOUT" });
    notifyMesaCobrar(table.name, totalUsd);
    showToast(`Solicitud de cobro enviada a caja: ${table.name}`, "success");
    setSelectedTableForDetails(null);
  };

  const handleCancelCheckout = (table, tab) => {
    if (!tab) return;
    updateTab(tab.id, tab.items, { status: "ACTIVE" });
    showToast(`Solicitud de cobro cancelada: ${table.name}`, "info");
    setSelectedTableForDetails(null);
  };


  const handleSearchKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, searchResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      // Barcode scanner (prefix 21)
      if (searchTerm.startsWith("21") && searchTerm.length >= 13) {
        const pluCode = parseInt(searchTerm.substring(2, 7), 10).toString();
        const weightKg = parseInt(searchTerm.substring(7, 12), 10) / 1000;
        const p = products.find(
          (p) =>
            p.id === pluCode ||
            p.barcode?.includes(pluCode) ||
            p.barcode?.includes(searchTerm.substring(0, 7)),
        );
        if (p) {
          addToCart({ ...p, isWeight: true }, weightKg);
          handleSetSearchTerm("");
          return;
        }
      }
      if (searchResults[selectedIndex]) addToCart(searchResults[selectedIndex]);
      else if (searchResults.length === 1) addToCart(searchResults[0]);
      else if (searchTerm.length >= 3 && searchResults.length === 0) {
        const exactMatch = products.find((p) => p.barcode === searchTerm);
        if (exactMatch) addToCart(exactMatch);
      }
    }
  };

  const handleUseSaldoFavor = () => {
    /* Managed internally by CheckoutModal */
  };

  const handleCheckout = async (payments, checkoutInfo = {}) => {
    triggerHaptic && triggerHaptic();
    const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
    if (cart.length === 0) return;

    const targetTotalUsd = tableCheckoutData ? finalTotalUsd : cartTotalUsd;
    const targetTotalBs = tableCheckoutData ? finalTotalBs : cartTotalBs;

    const totalPaidUsd = payments.reduce((acc, p) => acc + p.amountUsd, 0);
    const remainingUsd = Math.max(0, targetTotalUsd - totalPaidUsd);
    const changeUsd = Math.max(0, totalPaidUsd - targetTotalUsd);
    const changeBs = changeUsd * effectiveRate;

    if (!selectedCustomer && remainingUsd > 0.01) return;
    if (
      isNaN(targetTotalUsd) ||
      targetTotalUsd < 0 ||
      isNaN(totalPaidUsd) ||
      totalPaidUsd < 0
    ) {
      console.error("Abortando venta. Integridad matemática comprometida.");
      showToast("Error de integridad de datos. Revisa los montos.", "error");
      playError();
      return;
    }

    const fiadoAmountUsd = remainingUsd > 0.01 ? remainingUsd : 0;
    const sale = {
      id: crypto.randomUUID(),
      tipo: fiadoAmountUsd > 0 ? "VENTA_FIADA" : "VENTA",
      status: "COMPLETADA",
      kitchenStatus: "PENDING",
      items: cart.map((i) => ({
        id: i.id,
        name: i.name,
        qty: i.qty,
        priceUsd: i.priceUsd,
        costBs: i.costBs || 0,
        isWeight: i.isWeight,
        note: i.note || "",
      })),
      totalUsd: targetTotalUsd,
      totalBs: targetTotalBs,
      discountAmountUsd: tableCheckoutData ? discountAmountUsd : 0,
      vendedorNombre: tableCheckoutData?.tab?.customerInfo?.waiter || usuarioActivo?.nombre || "Cajero",
      payments,
      rate: effectiveRate,
      rateSource: useAutoRate ? (autoRateSource === "euro" ? "BCV Euro" : "BCV Dólar") : "Manual",
      timestamp: new Date().toISOString(),
      changeUsd: (fiadoAmountUsd > 0 || checkoutInfo?.saveChangeToWallet) ? 0 : changeUsd,
      changeBs: (fiadoAmountUsd > 0 || checkoutInfo?.saveChangeToWallet) ? 0 : changeBs,
      customerId: selectedCustomerId || null,
      customerName: selectedCustomer
        ? selectedCustomer.name
        : checkoutInfo?.clientName || cartCustomerName || "Consumidor Final",
      customerPhone: selectedCustomer?.phone || null,
      fiadoUsd: fiadoAmountUsd,
      deliveryType: checkoutInfo?.deliveryType || "LOCAL",
    };

    const existingSales = await storageService.getItem(SALES_KEY, []);

    // Calcular correlativo diario para la venta local
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const todaySales = existingSales.filter((s) => new Date(s.timestamp) >= startOfDay);

    const maxSaleNumber = todaySales.reduce(
      (mx, s) => Math.max(mx, s.saleNumber || 0),
      0,
    );
    sale.saleNumber = maxSaleNumber + 1;

    await storageService.setItem(SALES_KEY, [sale, ...existingSales]);
    addToQueue("UPLOAD_SALE", sale);
    logAction('VENTA', 'SALE_CREATED', `Venta realizada #${sale.saleNumber} por $${sale.totalUsd.toFixed(2)} (${sale.customerName})`, { saleId: sale.id, totalUsd: sale.totalUsd });



    // Deduct stock
    const updatedProducts = products.map((p) => {
      const cartItem = cart.find((i) => i.id === p.id);
      return cartItem
        ? { ...p, stock: Math.max(0, (p.stock ?? 0) - cartItem.qty) }
        : p;
    });
    setProducts(updatedProducts);
    await storageService.setItem("my_products_v1", updatedProducts);

    // Update customer debt / balance using unified financial logic
    if (selectedCustomer) {
      const amount_favor_used = payments
        .filter((p) => p.methodId === "saldo_favor")
        .reduce((sum, p) => sum + p.amountUsd, 0);

      const transaccionOpts = {
        usaSaldoFavor: amount_favor_used,
        esCredito: fiadoAmountUsd > 0,
        deudaGenerada: fiadoAmountUsd > 0 ? fiadoAmountUsd : 0,
        vueltoParaMonedero: (checkoutInfo?.saveChangeToWallet && changeUsd > 0.009) ? changeUsd : 0,
      };

      const updatedCustomer = procesarImpactoCliente(selectedCustomer, transaccionOpts);

      const updatedCustomers = customers.map((c) =>
        c.id === selectedCustomer.id ? updatedCustomer : c
      );
      setCustomers(updatedCustomers);
      await storageService.setItem("my_customers_v1", updatedCustomers);
    }

    // Send Web Order to Kitchen after payment
    if (pendingWebOrderId) {
      try {
        console.log(`Enviando webOrder ${pendingWebOrderId} a cocina...`);
        const { error } = await webSupabase
          .from("web_orders")
          .update({ status: "kitchen", updated_at: new Date().toISOString() })
          .eq("id", pendingWebOrderId);
        if (error) console.error("Error updating web order to kitchen:", error);
      } catch (err) {
        console.error("Failed to update web order", err);
      }
      setPendingWebOrderId(null);
    }

    if (printerConnected) {
      printTicket(sale, effectiveRate);
      printKitchen(sale);
    }

    setShowReceipt(sale);
    playCheckout();
    setShowConfetti(true);
    notifySaleComplete(sale.saleNumber, sale.totalUsd, sale.totalBs);
    notifyLowStock(updatedProducts);
    setCart([]);
    setShowCheckout(false);
    setSelectedCustomerId("");
    
    // Clear and release the active tab/table session if checked out
    if (activeTabId) {
      removeTab(activeTabId);
      setActiveTabId(null);
    }
    setTableCheckoutData(null);
    setShowTableBillModal(false);
    setActiveTableDiscount({ type: "percentage", value: 0 });
  };


  const handleCreateCustomer = async (name, phone) => {
    const newCustomer = {
      id: crypto.randomUUID(),
      name,
      phone: phone || "",
      deuda: 0,
      favor: 0,
      createdAt: new Date().toISOString(),
    };
    const updated = [...customers, newCustomer];
    setCustomers(updated);
    await storageService.setItem("my_customers_v1", updated);
    return newCustomer;
  };

  // ── Loading ───────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-slate-200 dark:border-slate-800 border-t-red-500 animate-spin" />
      </div>
    );
  }

  // ── Render ─────────────────────────────────────
  return (
    <div className="flex-1 min-h-0 flex flex-col bg-slate-50 dark:bg-slate-950 p-2 sm:p-4 overflow-hidden relative">
      <SalesHeader
        effectiveRate={effectiveRate}
        useAutoRate={useAutoRate}
        setUseAutoRate={setUseAutoRate}
        customRate={customRate}
        setCustomRate={setCustomRate}
        showRateConfig={showRateConfig}
        setShowRateConfig={setShowRateConfig}
        triggerHaptic={triggerHaptic}
        rates={rates}
        autoRateSource={autoRateSource}
        setAutoRateSource={setAutoRateSource}
      />

      {salesViewMode === "products" && (usuarioActivo?.rol === "ADMIN" || usuarioActivo?.rol === "CAJERO") && (
        <TableQueuePanel
          openTabs={openTabs}
          tables={tables}
          effectiveRate={effectiveRate}
          onCheckoutTable={(tab) => {
            const table = tables.find((t) => t.id === tab.customerInfo?.tableId);
            setTableCheckoutData({ tab, table });
            setShowTableBillModal(true);
          }}
        />
      )}


      {salesViewMode === "products" ? (
        <>
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px] gap-4 overflow-hidden">
            {/* Catálogo de Productos (Izquierda) */}
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              {/* Search + Popups */}
              <div className="shrink-0 mb-3 bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-sm border border-slate-100 dark:border-slate-800">
                <SearchBar
                  ref={searchInputRef}
                  searchTerm={searchTerm}
                  onSearchChange={handleSetSearchTerm}
                  onKeyDown={handleSearchKeyDown}
                  searchResults={searchResults}
                  selectedIndex={selectedIndex}
                  setSelectedIndex={setSelectedIndex}
                  effectiveRate={effectiveRate}
                  addToCart={addToCart}
                  isRecording={isRecording}
                  isProcessingAudio={isProcessingAudio}
                  toggleRecording={toggleRecording}
                  hierarchyPending={hierarchyPending}
                  setHierarchyPending={setHierarchyPending}
                  weightPending={weightPending}
                  setWeightPending={setWeightPending}
                />
              </div>

              {/* Category Chips + Product Grid */}
              {!showCheckout && !showReceipt && (
                <CategoryBar
                  selectedCategory={selectedCategory}
                  setSelectedCategory={setSelectedCategory}
                  filteredByCategory={filteredByCategory}
                  addToCart={addToCart}
                  triggerHaptic={triggerHaptic}
                  searchTerm={searchTerm}
                />
              )}

              {/* Open Tabs Drawer (Horizontally scrollable panel above the cart) */}
              <OpenTabsPanel
                openTabs={openTabs.filter(t => !t.customerInfo?.tableId)}
                onSelectTab={handleSelectOpenTab}
                onRemoveTab={handleRemoveOpenTab}
                triggerHaptic={triggerHaptic}
              />
            </div>

            {/* Panel de Carrito (Derecha) */}
            <div className="hidden lg:flex flex-col min-h-0 overflow-hidden lg:h-full">
              <CartPanel
                cart={cart}
                effectiveRate={effectiveRate}
                cartTotalUsd={cartTotalUsd}
                cartTotalBs={cartTotalBs}
                cartItemCount={cartItemCount}
                updateQty={updateQty}
                removeFromCart={removeFromCart}
                onCheckout={(name) => {
                  triggerHaptic && triggerHaptic();
                  setCartCustomerName(name);
                  setShowCheckout(true);
                }}
                onOpenTab={handleOpenTab}
                onClearCart={() => {
                  triggerHaptic && triggerHaptic();
                  setShowClearCartConfirm(true);
                }}
                onEditNote={(item) => {
                  triggerHaptic && triggerHaptic();
                  setNotePending(item);
                }}
                onEditOptions={(item) => {
                  triggerHaptic && triggerHaptic();
                  setEditingCartId(item.cartId || item.id);
                  setSelectedProductForOptions(item);
                }}
                onPrintPrecuenta={() => {
                  if (cart.length === 0) return;
                  triggerHaptic && triggerHaptic();
                  printPrecuenta({ name: cartCustomerName, items: cart }, effectiveRate);
                }}
                triggerHaptic={triggerHaptic}
                activeTabName={activeTabId ? cartCustomerName : null}
                isSidebar={true}
              />
            </div>
          </div>

          {/* ── Mobile Cart FAB & Bottom Sheet (lg:hidden) ── */}
          <div className="lg:hidden">
            {/* Floating Action Button */}
            {cart.length > 0 && !isCartSheetOpen && !showCheckout && !showReceipt && (
              <button
                onClick={() => {
                  triggerHaptic && triggerHaptic();
                  setIsCartSheetOpen(true);
                }}
                className="fixed bottom-[max(7.2rem,env(safe-area-inset-bottom)+6.5rem)] left-4 right-4 bg-brand hover:bg-brand-dark/95 text-white p-4 rounded-2xl shadow-xl shadow-brand/30 flex items-center justify-between z-40 active:scale-95 transition-all animate-in slide-in-from-bottom"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-xl">
                    <ShoppingCart size={20} />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-red-100 uppercase tracking-wider">Ver Cesta</div>
                    <div className="font-black leading-none">
                      {cartItemCount} artículo{cartItemCount !== 1 && "s"}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black leading-none">
                    ${cartTotalUsd.toFixed(2)}
                  </div>
                  <div className="text-xs font-bold text-red-100 mt-1">
                    Bs {formatBs(cartTotalBs)}
                  </div>
                </div>
              </button>
            )}

            {/* Bottom Sheet Overlay */}
            {isCartSheetOpen && !showCheckout && !showReceipt && (
              <div
                className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 pb-[max(0px,env(safe-area-inset-bottom))]"
                onClick={() => setIsCartSheetOpen(false)}
              >
                <div
                  className="bg-slate-50 dark:bg-slate-950 w-full rounded-t-3xl shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-full duration-300"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    className="shrink-0 flex justify-center pt-3 pb-2"
                    onClick={() => setIsCartSheetOpen(false)}
                  >
                    <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full cursor-pointer" />
                  </div>
                  <div className="shrink-0 px-4 pb-3 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
                    <h3 className="font-black text-slate-800 dark:text-white text-lg flex items-center gap-2">
                      <ShoppingCart size={20} className="text-brand" /> Cesta Actual
                    </h3>
                    <button
                      onClick={() => setIsCartSheetOpen(false)}
                      className="p-2 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <CartPanel
                      cart={cart}
                      effectiveRate={effectiveRate}
                      cartTotalUsd={cartTotalUsd}
                      cartTotalBs={cartTotalBs}
                      cartItemCount={cartItemCount}
                      updateQty={updateQty}
                      removeFromCart={removeFromCart}
                      onCheckout={(name) => {
                        triggerHaptic && triggerHaptic();
                        setCartCustomerName(name);
                        setShowCheckout(true);
                        setIsCartSheetOpen(false);
                      }}
                      onOpenTab={(name) => {
                        handleOpenTab(name);
                        setIsCartSheetOpen(false);
                      }}
                      onClearCart={() => {
                        triggerHaptic && triggerHaptic();
                        setShowClearCartConfirm(true);
                      }}
                      onEditNote={(item) => {
                        triggerHaptic && triggerHaptic();
                        setNotePending(item);
                      }}
                      onEditOptions={(item) => {
                        triggerHaptic && triggerHaptic();
                        setEditingCartId(item.cartId || item.id);
                        setSelectedProductForOptions(item);
                      }}
                      onPrintPrecuenta={() => {
                        if (cart.length === 0) return;
                        triggerHaptic && triggerHaptic();
                        printPrecuenta({ name: cartCustomerName, items: cart }, effectiveRate);
                      }}
                      triggerHaptic={triggerHaptic}
                      activeTabName={activeTabId ? cartCustomerName : null}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <TablesFloorPlan
          tables={tables}
          openTabs={openTabs}
          activeTabId={activeTabId}
          onSelectTable={handleSelectTable}
          onAddTable={handleAddTable}
          onRemoveTable={handleRemoveTable}
          effectiveRate={effectiveRate}
          triggerHaptic={triggerHaptic}
        />
      )}


      {/* Checkout Modal */}
      {showCheckout && (
        <CheckoutModal
          onClose={() => {
            setShowCheckout(false);
            setSelectedCustomerId("");
            setTableCheckoutData(null);
            setShowTableBillModal(false);
            setActiveTableDiscount({ type: "percentage", value: 0 });
          }}
          cartTotalUsd={finalTotalUsd}
          cartTotalBs={finalTotalBs}
          effectiveRate={effectiveRate}
          tasaBcv={effectiveRate}
          customerName={tableCheckoutData ? tableCheckoutData.tab.name : cartCustomerName} // Creado desde CartPanel
          customers={customers}
          selectedCustomerId={selectedCustomerId}
          setSelectedCustomerId={setSelectedCustomerId}
          paymentMethods={paymentMethods}
          onConfirmSale={handleCheckout}
          onUseSaldoFavor={handleUseSaldoFavor}
          onCreateCustomer={handleCreateCustomer}
          triggerHaptic={triggerHaptic}
        />
      )}

      {/* Product Options Modal (Para Tamaños y Extras) */}
      <ProductOptionsModal
        isOpen={!!selectedProductForOptions}
        onClose={() => {
          setSelectedProductForOptions(null);
          setEditingCartId(null);
        }}
        product={selectedProductForOptions}
        onAddToCart={(product, qty, size, extras, note) => {
          if (editingCartId) {
            // Replace item inside cart instead of creating new payload initially
            // Recalculate full unit price with edited options
            const basePrice = parseFloat(product.priceUsdt || product.priceUsd || product.price || 0);
            const combinedSizes = product?.sizes?.length > 0 ? [
              { name: product.baseSizeName || "Normal", price: basePrice },
              ...product.sizes
            ] : [];
            const sizeObj = combinedSizes.find((s) => s.name === size);
            const finalBasePrice = sizeObj ? parseFloat(sizeObj.priceUsdt || sizeObj.priceUsd || sizeObj.price) : basePrice;
            const extrasTotal = extras.reduce((sum, extra) => sum + parseFloat(extra.priceUsdt || extra.priceUsd || extra.price || 0), 0);
            const fullUnitPrice = finalBasePrice + extrasTotal;

            const newUniqueId = size ? `${product.id}_${size}` : product.id;

            setCart((prev) => prev.map((item) => {
              if (item.cartId === editingCartId || item.id === editingCartId) {
                return {
                  ...product,
                  id: product.id,
                  cartId: newUniqueId,
                  qty: qty,
                  size: size || null,
                  selectedExtras: extras,
                  note: note || "",
                  isWeight: false,
                  priceUsd: fullUnitPrice,
                };
              }
              return item;
            }));
          } else {
            handleAddToCartWithOptions(product, qty, size, extras, note);
          }
          setSelectedProductForOptions(null);
          setEditingCartId(null);
        }}
        exchangeRate={effectiveRate}
        triggerHaptic={triggerHaptic}
      />

      {/* Receipt Modal */}
      <ReceiptModal
        receipt={showReceipt}
        onClose={() => {
          setShowReceipt(null);
          setSelectedCustomerId("");
        }}
        onShareWhatsApp={(r) => {
          window.open(buildReceiptWhatsAppUrl(r), "_blank");
        }}
      />

      {/* Note Modifier Modal */}
      {notePending && (
        <NoteModifierModal
          item={notePending}
          onClose={() => setNotePending(null)}
          onSave={updateItemNote}
          triggerHaptic={triggerHaptic}
        />
      )}

      {/* Clear Cart Confirm */}
      <ConfirmModal
        isOpen={showClearCartConfirm}
        onClose={() => setShowClearCartConfirm(false)}
        onConfirm={() => {
          setCart([]);
          setShowClearCartConfirm(false);
        }}
        title="¿Vaciar toda la cesta?"
        message="Todos los productos serán eliminados de la cesta actual. Esta acción no se puede deshacer."
        confirmText="Sí, vaciar"
        variant="cart"
      />

      {/* Table Details Modal */}
      {selectedTableForDetails && (
        <TableDetailsModal
          isOpen={!!selectedTableForDetails}
          onClose={() => setSelectedTableForDetails(null)}
          table={selectedTableForDetails}
          tab={openTabs.find(
            (t) =>
              t.customerInfo?.tableId === selectedTableForDetails.id ||
              t.name === selectedTableForDetails.name
          )}
          effectiveRate={effectiveRate}
          products={products}
          usuarioActivo={usuarioActivo}
          onUpdateTabItems={(tabId, newItems) => {
            updateTab(tabId, newItems);
            if (activeTabId === tabId) {
              setCart(newItems);
            }
          }}
          onAddProducts={() =>
            handleDetailsAddProducts(
              selectedTableForDetails,
              openTabs.find(
                (t) =>
                  t.customerInfo?.tableId === selectedTableForDetails.id ||
                  t.name === selectedTableForDetails.name
              )
            )
          }
          onPrintPrecuenta={() => {
            const tab = openTabs.find(
              (t) =>
                t.customerInfo?.tableId === selectedTableForDetails.id ||
                t.name === selectedTableForDetails.name
            );
            if (tab) {
              printPrecuenta(tab, effectiveRate);
            }
          }}
          onCheckout={() =>
            handleDetailsCheckout(
              selectedTableForDetails,
              openTabs.find(
                (t) =>
                  t.customerInfo?.tableId === selectedTableForDetails.id ||
                  t.name === selectedTableForDetails.name
              )
            )
          }
          onReleaseTable={() =>
            handleDetailsReleaseTable(
              selectedTableForDetails,
              openTabs.find(
                (t) =>
                  t.customerInfo?.tableId === selectedTableForDetails.id ||
                  t.name === selectedTableForDetails.name
              )
            )
          }
          onSendToCashier={() =>
            handleSendToCashier(
              selectedTableForDetails,
              openTabs.find(
                (t) =>
                  t.customerInfo?.tableId === selectedTableForDetails.id ||
                  t.name === selectedTableForDetails.name
              )
            )
          }
          onCancelCheckout={() =>
            handleCancelCheckout(
              selectedTableForDetails,
              openTabs.find(
                (t) =>
                  t.customerInfo?.tableId === selectedTableForDetails.id ||
                  t.name === selectedTableForDetails.name
              )
            )
          }
          triggerHaptic={triggerHaptic}
        />
      )}

      {/* Table Release Confirm Modal */}
      {tableToReleasePending && (
        <ConfirmModal
          isOpen={!!tableToReleasePending}
          onClose={() => setTableToReleasePending(null)}
          onConfirm={() => {
            removeTab(tableToReleasePending.tab.id);
            showToast(`${tableToReleasePending.table.name} ha sido liberada.`, "error");
            setTableToReleasePending(null);
            setSelectedTableForDetails(null);
          }}
          title={`¿Liberar ${tableToReleasePending.table.name}?`}
          message="Se cancelará y eliminará permanentemente todo el consumo acumulado de esta mesa. Esta acción no se puede deshacer."
          confirmText="Sí, liberar mesa"
          variant="danger"
        />
      )}

      {/* Open Table Modal */}
      {tableForOpenModal && (
        <OpenTableModal
          isOpen={!!tableForOpenModal}
          onClose={() => setTableForOpenModal(null)}
          table={tableForOpenModal}
          activeWaiter={usuarioActivo?.nombre || "Cajero"}
          onConfirm={handleConfirmOpenTable}
          triggerHaptic={triggerHaptic}
        />
      )}

      {/* Table Bill Modal (Paso 1 del Cobro por Cola) */}
      {tableCheckoutData && showTableBillModal && (
        <TableBillModal
          tab={tableCheckoutData.tab}
          table={tableCheckoutData.table}
          effectiveRate={effectiveRate}
          onClose={() => {
            setTableCheckoutData(null);
            setShowTableBillModal(false);
            setActiveTableDiscount({ type: "percentage", value: 0 });
          }}
          onProceedToPayment={(disc, finalVal) => {
            setActiveTableDiscount(disc);
            handleSelectOpenTab(tableCheckoutData.tab);
            setShowCheckout(true);
            setShowTableBillModal(false);
          }}
          onPrintPrecuenta={() => {
            printPrecuenta(tableCheckoutData.tab, effectiveRate);
          }}
        />
      )}

      {/* Confetti */}
      {showConfetti && <Confetti onDone={() => setShowConfetti(false)} />}
    </div>
  );
}

