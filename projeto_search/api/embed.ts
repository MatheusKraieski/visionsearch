const HF_EMBED_URL = 'https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2/pipeline/feature-extraction';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });

  const token = process.env.HF_TOKEN;
  if (!token) return res.status(500).json({ error: 'HF_TOKEN not configured' });

  const response = await fetch(
    HF_EMBED_URL,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: text, options: { wait_for_model: true } }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    return res.status(response.status).json({ error: err.error ?? `HuggingFace error ${response.status}` });
  }

  const data = await response.json();
  const embedding: number[] = Array.isArray(data[0]) ? data[0] : data;
  return res.status(200).json({ embedding });
}
