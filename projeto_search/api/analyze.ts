export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { base64Image, mimeType } = req.body;
  if (!base64Image || !mimeType) {
    return res.status(400).json({ error: 'base64Image and mimeType are required' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GROQ_API_KEY not configured' });
  }

  try {
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
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Groq error:', error);
    return res.status(500).json({ error: error.message ?? 'Failed to analyze image' });
  }
}
