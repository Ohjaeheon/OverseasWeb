import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'redirect-to-base',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/' || req.url === '' || req.url === '/OverseasPortal') {
            res.statusCode = 302;
            res.setHeader('Location', '/OverseasPortal/');
            res.end();
            return;
          }
          next();
        });
      }
    }
  ],
  base: '/OverseasPortal/',
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
});
