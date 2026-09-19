import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('@supabase/supabase-js')) return 'vendor-supabase';
            if (id.includes('react') || id.includes('react-dom')) return 'vendor-react';
          }
          // Bundle Owner experience into separate on-demand chunk
          if (id.includes('components/owner/')) {
            return 'platform-ops';
          }
        }
      }
    }
  },
  server: {
    port: 5173,
    host: true
  }
});
