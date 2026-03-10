import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { storageService } from "../utils/storageService";
import { webSupabase } from "../utils/supabase";
import { useSounds } from "../hooks/useSounds";
import { useVoiceSearch } from "../hooks/useVoiceSearch";
import { useNotifications } from "../hooks/useNotifications";
import { useOpenTabs } from "../hooks/useOpenTabs";
import { getActivePaymentMethods } from "../config/paymentMethods";
import { showToast } from "../components/Toast";

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

const SALES_KEY = "bodega_sales_v1";

export default function SalesView({ rates, triggerHaptic, onNavigate }) {
  const { playAdd, playRemove, playCheckout, playError } = useSounds();
  const { notifySaleComplete, notifyLowStock } = useNotifications();

  // ── State ──────────────────────────────────────
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showClearCartConfirm, setShowClearCartConfirm] = useState(false);

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

  const bcvRate = rates.bcv?.price || 0;
  const effectiveRate = useAutoRate
    ? bcvRate
    : parseFloat(customRate) > 0
      ? parseFloat(customRate)
      : bcvRate;

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
  }, [useAutoRate, customRate]);

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
          newCart[existingIndex].qty += 1;
          return newCart;
        }

        if (existingIndex >= 0 && qtyOverride) {
          const newCart = [...prev];
          newCart[existingIndex].qty += qtyOverride;
          return newCart;
        }

        return [
          ...prev,
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
    } else {
      const tabName = customerName || `Mesa/Cuenta #${openTabs.length + 1}`;
      addTab(tabName, cart);
      showToast(`Cuenta guardada: ${tabName}`, "success");
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

    const totalPaidUsd = payments.reduce((acc, p) => acc + p.amountUsd, 0);
    const remainingUsd = Math.max(0, cartTotalUsd - totalPaidUsd);
    const changeUsd = Math.max(0, totalPaidUsd - cartTotalUsd);
    const changeBs = changeUsd * effectiveRate;

    if (!selectedCustomer && remainingUsd > 0.01) return;
    if (
      isNaN(cartTotalUsd) ||
      cartTotalUsd < 0 ||
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
      totalUsd: cartTotalUsd,
      totalBs: cartTotalBs,
      payments,
      rate: effectiveRate,
      rateSource: useAutoRate ? "BCV Auto" : "Manual",
      timestamp: new Date().toISOString(),
      changeUsd: fiadoAmountUsd > 0 ? 0 : changeUsd,
      changeBs: fiadoAmountUsd > 0 ? 0 : changeBs,
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


    // Deduct stock
    const updatedProducts = products.map((p) => {
      const cartItem = cart.find((i) => i.id === p.id);
      return cartItem
        ? { ...p, stock: Math.max(0, (p.stock ?? 0) - cartItem.qty) }
        : p;
    });
    setProducts(updatedProducts);
    await storageService.setItem("my_products_v1", updatedProducts);

    // Update customer debt
    const amount_favor_used = payments
      .filter((p) => p.methodId === "saldo_favor")
      .reduce((sum, p) => sum + p.amountUsd, 0);
    const debtIncurred = fiadoAmountUsd + amount_favor_used;
    if (selectedCustomer && debtIncurred > 0) {
      const updatedCustomers = customers.map((c) =>
        c.id === selectedCustomer.id
          ? { ...c, deuda: c.deuda + debtIncurred }
          : c,
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

    setShowReceipt(sale);
    playCheckout();
    setShowConfetti(true);
    notifySaleComplete(sale.saleNumber, sale.totalUsd, sale.totalBs);
    notifyLowStock(updatedProducts);
    setCart([]);
    setShowCheckout(false);
    setSelectedCustomerId("");
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
      {/* Header + Rate Config */}
      <SalesHeader
        effectiveRate={effectiveRate}
        useAutoRate={useAutoRate}
        setUseAutoRate={setUseAutoRate}
        customRate={customRate}
        setCustomRate={setCustomRate}
        showRateConfig={showRateConfig}
        setShowRateConfig={setShowRateConfig}
        triggerHaptic={triggerHaptic}
      />

      {/* Search + Popups (within header card would require restructure, keep sibling) */}
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
        openTabs={openTabs}
        onSelectTab={handleSelectOpenTab}
        onRemoveTab={handleRemoveOpenTab}
        triggerHaptic={triggerHaptic}
      />

      {/* Cart */}
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
        triggerHaptic={triggerHaptic}
        activeTabName={activeTabId ? cartCustomerName : null}
      />

      {/* Checkout Modal */}
      {showCheckout && (
        <CheckoutModal
          onClose={() => {
            setShowCheckout(false);
            setSelectedCustomerId("");
          }}
          cartTotalUsd={cartTotalUsd}
          cartTotalBs={cartTotalBs}
          effectiveRate={effectiveRate}
          tasaBcv={effectiveRate}
          customerName={cartCustomerName} // Creado desde CartPanel
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

      {/* Confetti */}
      {showConfetti && <Confetti onDone={() => setShowConfetti(false)} />}
    </div>
  );
}
