export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const templates = searchParams.get('templates') ?? '';
  const res = await fetch(`https://www.toptal.com/developers/gitignore/api/${templates}`);
  const text = await res.text();
  return new Response(text, {
    headers: { 'Content-Type': 'text/plain' },
  });
}
