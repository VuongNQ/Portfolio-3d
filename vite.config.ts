import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import { renderPage } from './src/content/render.ts';
import { validateTimeline, type Timeline } from './src/content/schema.ts';

const timelinePath = fileURLToPath(new URL('./content/timeline.json', import.meta.url));

/** Injects the timeline as static HTML into index.html (<!--slot:name-->), and fails on invalid data. */
function timelineHtml(): Plugin {
  return {
    name: 'timeline-html',
    configureServer(server) {
      server.watcher.add(timelinePath);
      server.watcher.on('change', (file) => {
        if (file === timelinePath) server.ws.send({ type: 'full-reload' });
      });
    },
    transformIndexHtml(html) {
      const data = JSON.parse(readFileSync(timelinePath, 'utf8')) as Timeline;
      const errors = validateTimeline(data);
      if (errors.length > 0)
        throw new Error(`content/timeline.json is invalid:\n- ${errors.join('\n- ')}`);
      const slots = renderPage(data);
      return html.replace(/<!--slot:([a-z-]+)-->/g, (match, key: string) => {
        if (!(key in slots)) throw new Error(`index.html has unknown slot "${key}"`);
        return slots[key] ?? match;
      });
    },
  };
}

export default defineConfig({
  // Relative URLs: the same build works at a domain root, under GitHub Pages' /Portfolio-3d/
  // subpath and after a repo rename. Dynamic imports resolve from import.meta.url.
  base: './',
  plugins: [timelineHtml()],
  build: {
    target: 'es2022',
    // three core is ~514 kB raw / ~128 kB gzip and loads lazily after first paint.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // three is only needed after the page has rendered; keep it in its own lazy chunk.
        manualChunks: (id) => (id.includes('node_modules/three') ? 'three' : undefined),
      },
    },
  },
});
