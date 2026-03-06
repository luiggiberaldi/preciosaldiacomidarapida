import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { ShoppingCart, Flame, UtensilsCrossed } from "lucide-react";
import { useCatalog } from "./hooks/useCatalog";
import { useCart } from "./hooks/useCart";
import ProductCard from "./components/ProductCard";
import CartOverlay from "./components/CartOverlay";
import BurgerHero from "./components/BurgerHero";

function MainLayout() {
  const [isScrolled, setIsScrolled] = useState(false);

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

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans transition-colors duration-300">
      {/* ─── HEADER PREMIUM ─── */}
      <header
        className={`sticky top-0 z-40 transition-all duration-300 ${isScrolled ? "bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg shadow-sm border-b border-slate-200 dark:border-slate-800" : "bg-transparent"}`}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <img
                src="/logo.png"
                alt="Precios Al Día"
                className="h-8 sm:h-10 dark:block hidden light-mode-logo"
                style={{ display: "none" }}
              />
              <img
                src="/logo.png"
                alt="Precios Al Día"
                className="h-8 sm:h-10 dark:hidden"
              />
              <img
                src="/logo dark.png"
                alt="Precios Al Día"
                className="h-8 sm:h-10 hidden dark:block"
              />
            </div>

            {/* Cart Button */}
            <div className="flex items-center">
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative p-2 text-slate-700 dark:text-slate-300 hover:text-red-500 dark:hover:text-red-400 transition-colors bg-slate-100 dark:bg-slate-800 rounded-2xl active:scale-95 shadow-sm"
              >
                <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
                {cartCount > 0 && (
                  <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-1 text-[10px] font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-500 rounded-full shadow-md shadow-red-500/40 border-2 border-white dark:border-slate-900 animate-in zoom-in">
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
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 -mt-6 sm:-mt-8 relative z-10 pb-24">
        <div className="bg-white dark:bg-slate-900 rounded-[32px] sm:rounded-[40px] shadow-2xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 p-4 sm:p-8 min-h-[400px]">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
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
