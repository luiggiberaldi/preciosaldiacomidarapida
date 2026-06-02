import React, { useState, useEffect, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, useParams, useSearchParams } from "react-router-dom";
import { ShoppingCart, UtensilsCrossed, Store, Search, LayoutGrid, Beef, Sandwich, Package, CupSoda, CircleFadingPlus, IceCream, Box, Hash, HandPlatter, ShieldCheck, Zap } from "lucide-react";
import { useCatalog } from "./hooks/useCatalog";
import { useCart } from "./hooks/useCart";
import ProductCard from "./components/ProductCard";
import CartOverlay from "./components/CartOverlay";
import ProductOptionsModal from "./components/ProductOptionsModal";
import BurgerHero from "./components/BurgerHero";

// Toast helper component
const Toast = ({ message, show }) => (
  <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] transition-all duration-300 ${show ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95 pointer-events-none'}`}>
    <div className="bg-slate-800 text-white px-4 py-2.5 rounded-2xl shadow-xl shadow-slate-900/20 font-bold text-sm flex items-center gap-2">
      <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} className="w-3 h-3 text-white">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      {message}
    </div>
  </div>
);

function StorePage() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const mesaParam = searchParams.get("mesa");
  const [activeCategory, setActiveCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);
  const [selectedOptionProduct, setSelectedOptionProduct] = useState(null);
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);
  const categoryRefs = useRef({});
  const toastTimeoutRef = useRef(null);

  const displayToast = (msg) => {
    setToastMessage(msg);
    setShowToast(true);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setShowToast(false), 2500);
  };

  useEffect(() => {
    document.documentElement.classList.remove("dark");
    localStorage.setItem("theme", "light");
  }, []);

  const { catalog, config, loading, notFound } = useCatalog(slug);
  const cartHooks = useCart();
  const { cartCount, isCartOpen, setIsCartOpen } = cartHooks;


  const filteredCatalog = catalog.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Group products by category
  const categoriesMap = filteredCatalog.reduce((acc, curr) => {
    const cat = curr.category || "Otros";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(curr);
    return acc;
  }, {});

  // Default PWA category ordering
  const PWA_CATEGORY_ORDER = [
    "perros",
    "hamburguesas",
    "pepitos",
    "arepas",
    "raciones",
    "combos",
    "bebidas",
    "postres",
    "extras"
  ];

  const CATEGORY_LABELS = {
    "hamburguesas": "Hamburguesas",
    "perros": "Perros Calientes",
    "combos": "Combos",
    "bebidas": "Bebidas",
    "extras": "Extras",
    "postres": "Postres",
    "raciones": "Raciones",
    "pepitos": "Pepitos",
    "arepas": "Arepas"
  };

  const CATEGORY_ICONS = {
    "hamburguesas": Beef,
    "perros": Sandwich,
    "combos": Package,
    "bebidas": CupSoda,
    "extras": CircleFadingPlus,
    "postres": IceCream,
    "raciones": Hash,
    "pepitos": Sandwich,
    "arepas": HandPlatter,
    "otros": Box
  };

  const categoryOrder = Object.keys(categoriesMap).sort((a, b) => {
    const idxA = PWA_CATEGORY_ORDER.indexOf(a.toLowerCase());
    const idxB = PWA_CATEGORY_ORDER.indexOf(b.toLowerCase());
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  // Scroll Spy via Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Encontrar la entrada más visible
        const visibleEntries = entries.filter((entry) => entry.isIntersecting);
        if (visibleEntries.length > 0) {
          // Si hay varias, tomar la primera
          setActiveCategory(visibleEntries[0].target.id);
        }
      },
      { rootMargin: "-120px 0px -60% 0px", threshold: 0.1 }
    );

    Object.values(categoryRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [categoryOrder.length]); // Re-run when categories change

  const scrollToCategory = (categoryId) => {
    setActiveCategory(categoryId);
    const element = document.getElementById(categoryId);
    if (element) {
      const headerOffset = 130; // Altura del sticky header + tab bar
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - headerOffset;
      window.scrollTo({ top: offsetPosition, behavior: "smooth" });
    }
  };

  const handleOpenOptionsModal = (product) => {
    setSelectedOptionProduct(product);
    setIsOptionsModalOpen(true);
  };

  // 404 — Negocio no encontrado
  if (notFound) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
          <Store size={48} className="text-slate-300" />
        </div>
        <h1 className="text-2xl font-black text-slate-700 mb-2">Negocio no encontrado</h1>
        <p className="text-slate-500 max-w-xs">
          El enlace que usaste no corresponde a ningún negocio registrado. Verifica el link o contacta al vendedor.
        </p>
      </div>
    );
  }

  // Category badging utility: checks if any product in a category is in the cart
  const hasItemsInCategory = (categoryKey) => {
    if (!cartHooks.cart || cartHooks.cart.length === 0) return false;
    const productsInCat = categoriesMap[categoryKey] || [];
    return productsInCat.some(p => cartHooks.cart.some(cartItem => cartItem.id === p.id));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans relative">
      <Toast message={toastMessage} show={showToast} />
      {/* ─── HEADER PREMIUM ─── */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md shadow-[0_4px_30px_rgb(0,0,0,0.03)] border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col">
            {/* Top Bar: Logo & Cart */}
            <div className="flex items-center justify-between h-16 sm:h-20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden border border-slate-200">
                  <img
                    src="/logo_principal.png"
                    alt={config.business_name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-base sm:text-lg font-black text-slate-800 leading-tight capitalize">
                    {config.business_name || "Cargando..."}
                  </span>
                  <span className="text-[10px] sm:text-xs font-bold text-emerald-500 uppercase flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                    Abierto
                  </span>
                </div>
              </div>

              {/* Cart Button */}
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative p-2.5 sm:p-3 text-slate-700 hover:text-red-500 bg-slate-50 hover:bg-red-50 rounded-full active:scale-95 transition-all border border-slate-100"
              >
                <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-black text-white bg-red-500 rounded-full shadow-md border-2 border-white">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>

            {/* Sticky Categories Bar */}
            {!loading && !notFound && categoryOrder.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto py-3 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                {categoryOrder.map((cat) => {
                  const Icon = CATEGORY_ICONS[cat.toLowerCase()] || LayoutGrid;
                  return (
                    <button
                      key={cat}
                      onClick={() => scrollToCategory(`category-${cat}`)}
                      className={`whitespace-nowrap flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-all duration-300 capitalize relative ${activeCategory === `category-${cat}`
                        ? "bg-slate-900 text-white shadow-md transform scale-105"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                    >
                      <Icon size={16} strokeWidth={2} />
                      {CATEGORY_LABELS[cat.toLowerCase()] || cat}
                      {hasItemsInCategory(cat) && (
                        <span className="w-2 h-2 rounded-full bg-red-500 ml-0.5 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Video */}
      {!loading && !notFound && <BurgerHero />}

      {/* Trust Bar */}
      <div className="bg-emerald-50/50 border-b border-emerald-100/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-center gap-4 sm:gap-8 text-[11px] sm:text-xs font-bold text-emerald-800">
          <div className="flex items-center gap-1.5 border-r border-emerald-200/50 pr-4 sm:pr-8">
            <Zap size={14} className="text-emerald-500" />
            <span>Entrega rápida / Retiro local</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span>Precios actualizados a la tasa del día</span>
          </div>
        </div>
      </div>

      {/* ─── MAIN CONTENT ─── */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28">
        {/* Search Bar */}
        <div className="mb-8 relative max-w-full">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search size={18} className="text-slate-400" />
          </div>
          <input
            type="text"
            className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-sm transition-shadow placeholder-slate-400"
            placeholder="¿Qué se te antoja hoy?"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="w-full min-h-[400px]">
          {/* Menu Catalog */}
          {loading ? (
            <div className="space-y-10 sm:space-y-14">
              <section>
                <div className="h-8 w-48 bg-slate-200 animate-pulse rounded-lg mb-6"></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {Array.from({ length: 8 }).map((_, idx) => (
                    <div key={idx} className="bg-white rounded-3xl p-3 border border-slate-100 h-32 flex gap-4 animate-pulse">
                      <div className="w-24 h-24 bg-slate-100 rounded-2xl shrink-0"></div>
                      <div className="flex-1 py-1 flex flex-col justify-between">
                        <div className="space-y-2">
                          <div className="h-4 bg-slate-200 rounded-full w-full"></div>
                          <div className="h-3 bg-slate-100 rounded-full w-2/3"></div>
                        </div>
                        <div className="flex items-end justify-between">
                          <div className="h-5 bg-slate-200 rounded-lg w-16"></div>
                          <div className="h-8 w-8 bg-slate-100 rounded-full"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ) : catalog.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                <UtensilsCrossed size={40} className="text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-700 mb-2">Menú no disponible</h3>
              <p className="text-slate-500 max-w-xs">
                Este negocio aún no ha publicado sus productos.
              </p>
            </div>
          ) : (
            <div className="space-y-10 sm:space-y-14">
              {categoryOrder.length === 0 && searchQuery && (
                <div className="text-center py-12 px-4 bg-white rounded-3xl border border-slate-100 shadow-sm max-w-2xl mx-auto">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search size={24} className="text-slate-400" />
                  </div>
                  <h3 className="text-xl font-black text-slate-800 mb-2">
                    No encontramos "{searchQuery}"
                  </h3>
                  <p className="text-slate-500 mb-6">Prueba buscando otra cosa o explora nuestras categorías populares.</p>

                  <div className="flex flex-wrap justify-center gap-2">
                    {["Hamburguesas", "Combos", "Bebidas", "Postres"].map(cat => (
                      <button
                        key={cat}
                        onClick={() => {
                          setSearchQuery("");
                          scrollToCategory(`category-${cat.toLowerCase()}`);
                        }}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-colors"
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {categoryOrder.map((category) => (
                <section
                  key={category}
                  id={`category-${category}`}
                  ref={(el) => (categoryRefs.current[`category-${category}`] = el)}
                  className="scroll-mt-36" // Offset para el sticky header
                >
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-800 mb-6 flex items-center capitalize">
                    {CATEGORY_LABELS[category.toLowerCase()] || category}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                    {categoriesMap[category].map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onAdd={(p) => {
                          cartHooks.addToCart(p);
                          displayToast("Producto agregado al carrito");
                        }}
                        cartItems={cartHooks.cart}
                        onUpdateQty={cartHooks.updateQty}
                        onRemove={cartHooks.removeFromCart}
                        exchangeRate={config.exchange_rate || 1}
                        onOptionsClick={handleOpenOptionsModal}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>

      <ProductOptionsModal
        isOpen={isOptionsModalOpen}
        onClose={() => {
          setIsOptionsModalOpen(false);
          setSelectedOptionProduct(null);
        }}
        product={selectedOptionProduct}
        onAddToCart={(product, qty, size, selectedExtras, note) => {
          cartHooks.addToCart(product, qty, size, selectedExtras, note);
          displayToast("Producto agregado al carrito");
        }}
        exchangeRate={config.exchange_rate || 1}
      />

      <CartOverlay
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartHooks={cartHooks}
        tenantId={config.tenant_id}
        exchangeRate={config.exchange_rate || 1}
        tableNumberFromUrl={mesaParam}
        hasDelivery={config.has_delivery !== false}
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
        <Route path="/:slug" element={<StorePage />} />
        <Route path="/" element={
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 text-center">
            <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-6">
              <Store size={48} className="text-red-300" />
            </div>
            <h1 className="text-2xl font-black text-slate-700 mb-2">Precios Al Día</h1>
            <p className="text-slate-500 max-w-xs">
              Para ver el menú de un negocio, necesitas un enlace directo del vendedor.
            </p>
          </div>
        } />
      </Routes>
    </Router>
  );
}

export default App;
