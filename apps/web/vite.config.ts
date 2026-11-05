import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Geliştirmede /api istekleri canlı API'ye yönlendirilir (CORS gerekmez).
// Üretimde VITE_API_URL tam adres olarak verilir ve API tarafında CORS açılmalıdır.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://api.sozcutvcanli.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
