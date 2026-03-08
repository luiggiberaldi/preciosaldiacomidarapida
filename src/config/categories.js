import {
  Utensils,
  Sandwich,
  Flame,
  Pizza,
  Coffee,
  Package,
  LayoutGrid,
  Beef,
  CupSoda,
  Tag,
  IceCream,
  CircleFadingPlus,
  Box,
} from "lucide-react";

// Categorías de comida rápida
export const FOOD_CATEGORIES = [
  { id: "todos", label: "Todos", icon: "🍔", color: "slate" }, // Emoji temporal, se sobreescribe con icon de lucide
  { id: "hamburguesas", label: "Hamburguesas", icon: "🍔", color: "fast_yellow" },
  { id: "perros", label: "Perros Calientes", icon: "🌭", color: "fast_red" },
  { id: "combos", label: "Combos", icon: "🎁", color: "fast_orange" },
  { id: "bebidas", label: "Bebidas", icon: "🥤", color: "fast_blue" },
  { id: "extras", label: "Extras", icon: "🧀", color: "fast_amber" },
  { id: "postres", label: "Postres", icon: "🍦", color: "fast_green" },
];

export { FOOD_CATEGORIES as BODEGA_CATEGORIES };

// Lucide icon map for factory categories (if you prefer rendering SVGs over Emojis for specific IDs)
export const CATEGORY_ICONS = {
  todos: LayoutGrid,
  hamburguesas: Beef,
  perros: Sandwich,
  combos: Package,
  bebidas: CupSoda,
  extras: CircleFadingPlus,
  postres: IceCream,
  otros: Box,
};

export const UNITS = [
  { id: "unidad", label: "Unidad", short: "uni" },
  { id: "combo", label: "Combo", short: "cmb" },
  { id: "porcion", label: "Porción", short: "por" },
];

// Colores de Tailwind para las pastillas de categoría
export const CATEGORY_COLORS = {
  fast_red:
    "bg-red-500 text-white border-transparent shadow-sm dark:bg-red-600", // Ketchup
  fast_yellow:
    "bg-yellow-400 text-yellow-900 border-yellow-500 shadow-sm font-black dark:bg-yellow-500", // Queso
  fast_orange:
    "bg-orange-500 text-white border-transparent shadow-sm dark:bg-orange-600", // Fuego
  fast_amber:
    "bg-amber-400 text-amber-900 border-amber-500 shadow-sm font-black dark:bg-amber-600", // Fritura
  fast_blue:
    "bg-blue-500 text-white border-transparent shadow-sm dark:bg-blue-600", // Frio/Hielo
  fast_green:
    "bg-emerald-500 text-white border-transparent shadow-sm dark:bg-emerald-600", // Salsas/Verduras
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  cyan: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  orange:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  yellow:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  slate: "bg-slate-100 text-slate-700 dark:bg-slate-700/30 dark:text-slate-400",
  red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  gray: "bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400",
};
