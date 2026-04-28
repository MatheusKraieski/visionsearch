import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'api-dev-middleware',
        configureServer(server) {
          server.middlewares.use('/api/embed', async (req: any, res: any) => {
            if (req.method !== 'POST') { res.statusCode = 405; res.end(JSON.stringify({ error: 'Method not allowed' })); return; }
            let body = '';
            req.on('data', (chunk: any) => (body += chunk));
            req.on('end', async () => {
              try {
                const { text } = JSON.parse(body);
                const token = env.HF_TOKEN;
                if (!token) throw new Error('HF_TOKEN not configured');
                const r = await fetch('https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2/pipeline/feature-extraction', {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                  body: JSON.stringify({ inputs: text, options: { wait_for_model: true } }),
                });
                if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error ?? `HuggingFace error ${r.status}`); }
                const data = await r.json();
                const embedding: number[] = Array.isArray(data[0]) ? data[0] : data;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ embedding }));
              } catch (err: any) { res.statusCode = 500; res.end(JSON.stringify({ error: err.message })); }
            });
          });

          server.middlewares.use('/api/analyze', async (req: any, res: any) => {
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.end(JSON.stringify({ error: 'Method not allowed' }));
              return;
            }

            let body = '';
            req.on('data', (chunk: any) => (body += chunk));
            req.on('end', async () => {
              try {
                const { base64Image, mimeType } = JSON.parse(body);
                const apiKey = env.GROQ_API_KEY;
                if (!apiKey) throw new Error('GROQ_API_KEY not configured');

                const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
                    messages: [
                      {
                        role: 'user',
                        content: [
                          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } },
                          { type: 'text', text: 'Analyze this product image. Identify the product name, category, and provide 5-10 descriptive keywords or tags that could be used to search for this product in a database. Return the result in JSON format with fields: productName, category, tags (array of strings).' },
                        ],
                      },
                    ],
                    response_format: { type: 'json_object' },
                    temperature: 0.1,
                  }),
                });

                if (!response.ok) {
                  const err = await response.json().catch(() => ({}));
                  throw new Error(err.error?.message ?? 'Groq API error');
                }

                const data = await response.json();
                const result = JSON.parse(data.choices[0].message.content);
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(result));
              } catch (err: any) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: err.message }));
              }
            });
          });
        },
      },
    ],
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
