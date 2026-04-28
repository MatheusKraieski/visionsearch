export async function getEmbedding(text: string): Promise<number[]> {
  const response = await fetch('/api/embed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error ?? 'Embedding error');
  }

  const { embedding } = await response.json();
  return embedding;
}
