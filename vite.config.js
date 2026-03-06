import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Archivos estáticos que deben estar disponibles offline
      includeAssets: ['icono.png', 'logodark.png', 'logoprincipal.png'],
      workbox: {
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
      },
      manifest: {
        name: 'Precios Al Día — Comida Rápida',
        short_name: 'PreciosAlDía Comida',
        description: 'Punto de venta para carritos de comida rápida en Venezuela',
        theme_color: '#dc2626', // red-600
        background_color: '#0f172a', // Verde esmeralda de la marca
        display: 'standalone', // Modo app nativa (sin barra de navegador)
        orientation: 'portrait', // Bloquear rotación
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'icono.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icono.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'icono.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        shortcuts: [
          {
            name: "Tomar Pedido",
            short_name: "Vender",
            description: "Abrir directamente el Punto de Venta",
            url: "/?view=ventas",
            icons: [{ src: "pwa-192x192.png", sizes: "192x192" }]
          },
          {
            name: "Ver Menú",
            short_name: "Menú",
            description: "Abrir el menú del carrito",
            url: "/?view=catalogo",
            icons: [{ src: "pwa-192x192.png", sizes: "192x192" }]
          }
        ]
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          icons: ['lucide-react'],
        }
      }
    }
  },
})