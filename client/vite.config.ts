import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import path from 'path';

export default defineConfig({
  base: '/dash/',
  plugins: [react(), svgr()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/dash/logs': {
        // Default to the TestDashboardInstance port (8000) if not provided
        target: `http://${process.env.VITE_REACT_APP_HOST || 'localhost'}:${process.env.VITE_REACT_APP_PORT || '8000'}`,
        changeOrigin: true,
      },
    },
  },
});
