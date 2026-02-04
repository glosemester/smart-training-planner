import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React libraries
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],

          // Firebase - split into separate chunk
          'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/functions', 'firebase/storage'],

          // Animation libraries
          'animation': ['framer-motion'],

          // Date utilities
          'date-utils': ['date-fns'],

          // UI libraries
          'ui-vendor': ['lucide-react', 'react-hot-toast'],

          // Chart library (large)
          'charts': ['recharts'],
        }
      }
    },
    chunkSizeWarningLimit: 600 // Increase limit slightly for specific chunks
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png', 'masked-icon.svg', 'icon.svg'],
      manifest: {
        name: 'RunCoach - AI Treningscoach',
        short_name: 'RunCoach',
        description: 'AI-drevet treningscoach for løping, ernæring og treningsplanlegging',
        theme_color: '#B9E43C',
        background_color: '#060606',
        display: 'standalone',
        start_url: '/',
        orientation: 'portrait',
        categories: ['health', 'fitness', 'sports'],
        icons: [
          {
            src: 'icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: 'masked-icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable'
          },
          {
            src: 'app-icon.png',
            sizes: '1024x1024',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png',
            purpose: 'any'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'firestore-data',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 1 day
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  server: {
    port: 3000
  }
})
