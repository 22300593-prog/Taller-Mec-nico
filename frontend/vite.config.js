import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const interactiveDiagram = resolve(import.meta.dirname, '../docs/diagrama-interactivo-clientes.html');

/** Expone el diagrama del proyecto sin duplicar el archivo dentro de frontend. */
export default defineConfig({
  plugins: [{
    name: 'serve-project-docs',
    configureServer(server) {
      server.middlewares.use('/docs/diagrama-interactivo-clientes.html', async (_req, res, next) => {
        try {
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(await readFile(interactiveDiagram));
        } catch (error) {
          next(error);
        }
      });
    }
  }]
});
