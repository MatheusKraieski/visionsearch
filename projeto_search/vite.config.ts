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
                const { GoogleGenAI } = await import('@google/genai');
                const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

                const response = await ai.models.generateContent({
                  model: 'gemini-1.5-flash',
                  contents: [
                    {
                      parts: [
                        { inlineData: { data: base64Image, mimeType } },
                        {
                          text: 'Analyze this product image. Identify the product name, category, and provide 5-10 descriptive keywords or tags that could be used to search for this product in a database. Return the result in JSON format with fields: productName, category, tags (array of strings).',
                        },
                      ],
                    },
                  ],
                  config: { responseMimeType: 'application/json' },
                });

                res.setHeader('Content-Type', 'application/json');
                res.end(response.text);
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
