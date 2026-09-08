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
        // Forme fonction : capture TOUS les modules d'un paquet (y compris les
        // sous-chemins comme @heroicons/react/24/outline ou react-dom/client),
        // contrairement à la forme objet qui ne cible que le point d'entrée.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('@heroicons')) return 'icons';
          if (id.includes('chart.js') || id.includes('react-chartjs-2')) return 'chart-vendor';
          if (id.includes('leaflet')) return 'map-vendor';
          if (
            id.includes('react-dom') ||
            id.includes('scheduler') ||
            /[\\/]node_modules[\\/](react|react-router|react-router-dom)[\\/]/.test(id)
          ) {
            return 'react-vendor';
          }
          // Tous les autres modules tiers (axios, etc.)
          return 'vendor';
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

