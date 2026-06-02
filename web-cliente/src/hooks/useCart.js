import { useState, useEffect, useMemo } from "react";
import { getPriceUsd } from "../utils/priceHelpers";

/** Safe localStorage read */
function readCartFromStorage() {
  try {
    const saved = localStorage.getItem("web_cart");
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

/** Safe localStorage write */
function writeCartToStorage(cart) {
  try {
    localStorage.setItem("web_cart", JSON.stringify(cart));
  } catch {
    // Silently fail (private browsing, quota exceeded)
  }
}

export function useCart() {
  const [cart, setCart] = useState(readCartFromStorage);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    writeCartToStorage(cart);
  }, [cart]);

  const addToCart = (
    product,
    qty = 1,
    size = "",
    selectedExtras = [],
    note = "",
  ) => {
    setCart((prev) => {
      // Check if exact same item exists (same id, size, extras, note)
      const extrasKey = selectedExtras
        .map((e) => e.name)
        .sort()
        .join("|");
      const existingIndex = prev.findIndex(
        (item) =>
          item.id === product.id &&
          item.size === size &&
          item.note === note &&
          item.extrasKey === extrasKey,
      );

      // Calculate item base unit price
      let unitPrice = getPriceUsd(product);
      if (size && product.sizes?.length > 0) {
        const foundSize = product.sizes.find(s => s.name === size);
        if (foundSize) {
          unitPrice = getPriceUsd(foundSize);
        }
      }

      // Add extras price
      if (selectedExtras && selectedExtras.length > 0) {
        const extrasTotal = selectedExtras.reduce(
          (sum, ext) => sum + getPriceUsd(ext),
          0,
        );
        unitPrice += extrasTotal;
      }

      if (existingIndex >= 0) {
        const newCart = [...prev];
        newCart[existingIndex].qty += qty;
        return newCart;
      }

      // Safe ID generation for non-HTTPS local networks
      const safeId = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

      return [
        ...prev,
        {
          cartId: safeId,
          id: product.id,
          name: product.name,
          priceUsd: unitPrice,
          basePrice: getPriceUsd(product),
          qty,
          size,
          selectedExtras,
          extrasKey,
          note,
          image: product.image_url,
        },
      ];
    });
  };

  const removeFromCart = (cartId) => {
    setCart((prev) => prev.filter((item) => item.cartId !== cartId));
  };

  const updateQty = (cartId, delta) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.cartId === cartId) {
          const newQty = Math.max(1, item.qty + delta);
          return { ...item, qty: newQty };
        }
        return item;
      }),
    );
  };

  const updateNote = (cartId, note) => {
    setCart((prev) =>
      prev.map((item) =>
        item.cartId === cartId ? { ...item, note } : item
      )
    );
  };

  const clearCart = () => setCart([]);

  const cartTotal = useMemo(() => cart.reduce(
    (sum, item) => sum + item.priceUsd * item.qty,
    0,
  ), [cart]);

  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart]);

  return {
    cart,
    addToCart,
    removeFromCart,
    updateQty,
    updateNote,
    clearCart,
    cartTotal,
    cartCount,
    isCartOpen,
    setIsCartOpen,
  };
}
