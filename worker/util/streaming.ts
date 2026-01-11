export function sseHeaders() {
  return {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  };
}

export function sseData(data: string) {
  // SSEは data: を各行につけるのが安全
  const lines = data.split("\n").map((l) => `data: ${l}`);
  return `${lines.join("\n")}\n\n`;
}
