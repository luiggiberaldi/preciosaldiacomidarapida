import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { ShoppingCart, Flame, UtensilsCrossed } from "lucide-react";
import { useCatalog } from "./hooks/useCatalog";
import { useCart } from "./hooks/useCart";
import ProductCard from "./components/ProductCard";
import CartOverlay from "./components/CartOverlay";
import BurgerHero from "./components/BurgerHero";

function MainLayout() {

  useEffect(() => {
    // Eliminar la clase dark y setear light en localStorage por defecto
    document.documentElement.classList.remove("dark");
    localStorage.setItem("theme", "light");
  }, []);

  const { catalog, config, loading } = useCatalog();
  const cartHooks = useCart();
  const { cartCount, isCartOpen, setIsCartOpen } = cartHooks;

  // Group products by category
  const categoriesMap = catalog.reduce((acc, curr) => {
    const cat = curr.category || "Otros";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(curr);
    return acc;
  }, {});

  const categoryOrder = Object.keys(categoriesMap).sort();



  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans transition-colors duration-300">
      {/* ─── HEADER PREMIUM ─── */}
      <header
        className="sticky top-0 z-40 bg-white shadow-sm"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <img
                src="/logo_principal.png"
                alt="Precios Al Día"
                className="h-10 sm:h-12 w-auto object-contain transition-all duration-500 hover:scale-105"
              />
            </div>

            {/* Cart Button */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative p-2.5 text-slate-700 dark:text-slate-300 hover:text-red-500 bg-slate-100 dark:bg-slate-800 rounded-2xl active:scale-95 shadow-sm transition-all"
              >
                <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-[10px] font-black leading-none text-white bg-red-500 rounded-full shadow-lg shadow-red-500/40 border-2 border-white dark:border-slate-900">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Antigravity Flow Hero */}
      <BurgerHero />

      {/* ─── MAIN CONTENT ─── */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 sm:-mt-12 lg:-mt-16 relative z-10 pb-24">
        <div className="bg-white dark:bg-slate-900 rounded-[32px] sm:rounded-[40px] shadow-2xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 p-5 sm:p-8 lg:p-10 min-h-[400px]">
          {/* Menu Catalog */}
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400 dark:text-slate-600">
              <div className="w-10 h-10 rounded-full border-4 border-slate-200 dark:border-slate-800 border-t-red-500 animate-spin mb-4" />
              <p className="font-bold">Cargando menú...</p>
            </div>
          ) : catalog.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                <UtensilsCrossed
                  size={40}
                  className="text-slate-300 dark:text-slate-600"
                />
              </div>
              <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">
                Aún no hay platos aquí
              </h3>
              <p className="text-slate-500 max-w-xs">
                Nuestro chef está preparando el menú, por favor vuelve más
                tarde.
              </p>
            </div>
          ) : (
            <div className="space-y-12">
              {categoryOrder.map((category) => (
                <section key={category}>
                  <h2 className="text-2xl font-black text-slate-800 dark:text-white capitalize mb-6 flex items-center gap-3">
                    <span className="w-5 h-1 bg-red-500 rounded-full block" />
                    {category}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
                    {categoriesMap[category].map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onAdd={(p) => cartHooks.addToCart(p)}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>

      <CartOverlay
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartHooks={cartHooks}
      />

      {/* Floating Action Button for Mobile Cart */}
      {cartCount > 0 && !isCartOpen && (
        <button
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-8 right-6 z-50 p-4 bg-red-600 text-white rounded-full shadow-2xl shadow-red-500/50 flex items-center gap-2 animate-bounce hover:animate-none group active:scale-90 transition-all sm:hidden"
        >
          <ShoppingCart size={24} />
          <span className="bg-white text-red-600 px-2 py-0.5 rounded-full text-xs font-black">
            {cartCount}
          </span>
        </button>
      )}
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainLayout />} />
      </Routes>
    </Router>
  );
}

export default App;
