import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Sous Vitest, React doit charger sa build de développement : un NODE_ENV=production
// global (machine) casserait React.act utilisé par @testing-library/react.
// Vitest ne force 'test' que si la variable n'est pas déjà définie.
if (process.env.VITEST && process.env.NODE_ENV !== 'test') {
  process.env.NODE_ENV = 'test'
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,
      }
    }
  },
  build: {
    // Optimize build output
    target: 'es2015',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true
      }
    },
    // Code splitting configuration
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks for better caching
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'chart-vendor': ['chart.js', 'react-chartjs-2'],
          'map-vendor': ['leaflet', 'react-leaflet', 'leaflet-draw'],
          'icons': ['@heroicons/react']
        }
      }
    },
    // Chunk size warnings
    chunkSizeWarningLimit: 500,
    // Source maps for production debugging (optional)
    sourcemap: false
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@heroicons/react/24/outline',
      '@heroicons/react/24/solid'
    ]
  }
})

