// FILE: server.ts
// SECURITY: Host 0.0.0.0, Port 3000 binding, Production/Dev asset routing
// AGENT: Core Runtime Entry Point

import express from 'express';
import path from 'path';
import { createServerApp } from './server/src/index.js';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = createServerApp();
  const PORT = 3000;

  // Mount Vite middleware in development
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ARIA Server] Server running on http://0.0.0.0:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

startServer().catch((err) => {
  console.error('[ARIA Server] Fatal startup error:', err);
  process.exit(1);
});
