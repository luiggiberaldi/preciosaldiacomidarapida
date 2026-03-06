import { useState, useEffect, useMemo } from "react";

export function useCart() {
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem("web_cart");
    return saved ? JSON.parse(saved) : [];
  });

  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("web_cart", JSON.stringify(cart));
  }, [cart]);

  const addToCart = (
    product,
    qty = 1,
    size = "Sencillo",
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

      // Calculate item unit price
      let unitPrice = product.price_usd;

      // Add extras price
      if (selectedExtras && selectedExtras.length > 0) {
        const extrasTotal = selectedExtras.reduce(
          (sum, ext) => sum + (parseFloat(ext.price) || 0),
          0,
        );
        unitPrice += extrasTotal;
      }

      if (existingIndex >= 0) {
        const newCart = [...prev];
        newCart[existingIndex].qty += qty;
        return newCart;
      }

      return [
        ...prev,
        {
          cartId: crypto.randomUUID(),
          id: product.id,
          name: product.name,
          priceUsd: unitPrice,
          basePrice: product.price_usd,
          qty,
          size,
          selectedExtras,
          extrasKey,
          note,
          image: product.image_url,
        },
      ];
    });

    // Auto open cart occasionally, or just highlight it. We highlight via a toast or animation usually.
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
    clearCart,
    cartTotal,
    cartCount,
    isCartOpen,
    setIsCartOpen,
  };
}
