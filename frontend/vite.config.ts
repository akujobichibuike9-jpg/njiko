import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Frontend runs on 5180. /api is proxied to the backend on 4000 in dev.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['brand/favicon-48.png', 'brand/apple-touch-icon.png'],
      manifest: {
        name: 'Njiko',
        short_name: 'Njiko',
        description: 'Njiko — local delivery marketplace. By Chivera.',
        theme_color: '#090C0D',
        background_color: '#0b0f10',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/brand/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/brand/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      devOptions: { enabled: true },
    }),
  ],
  server: {
    port: 5180,
    proxy: { '/api': 'http://localhost:4000' },
  },
});
