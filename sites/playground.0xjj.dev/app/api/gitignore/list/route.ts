export async function GET() {
  const res = await fetch('https://www.toptal.com/developers/gitignore/api/list');
  const text = await res.text();
  return new Response(text, {
    headers: { 'Content-Type': 'text/plain' },
  });
}
