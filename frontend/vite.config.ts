import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
// import { componentTagger } from "lovable-tagger"; // Keep if you use it

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::", // Or 'localhost'
    port: 8080, // Or your preferred frontend port (e.g., 5173 which is common for Vite)
    proxy: {
      // Proxy API requests to your backend server
      '/api': {
        target: 'http://localhost:3001', // Your backend server address
        changeOrigin: true, // Recommended for virtual hosted sites
        // rewrite: (path) => path.replace(/^\/api/, '') // Uncomment if your backend routes don't start with /api
      }
    }
  },
  plugins: [
    react(),
    // mode === 'development' && componentTagger(), // Keep if you use it
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));