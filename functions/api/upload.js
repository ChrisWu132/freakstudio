/* Stores one quote-form attachment in R2 and returns its download link.
   Limits match the form hint in index.html; js/main.js checks them first. */
const MAX_BYTES = 20 * 1024 * 1024;

export async function onRequestPost({ request, env }) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return Response.json({ error: "No file" }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: "File over 20 MB" }, { status: 413 });
  const name = file.name.replace(/[^\w.\-]+/g, "_").slice(-120) || "file";
  const key = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}/${name}`;
  await env.ATTACHMENTS.put(key, file.stream(), { httpMetadata: { contentType: file.type || "application/octet-stream" } });
  return Response.json({ url: `${new URL(request.url).origin}/files/${key}` });
}
