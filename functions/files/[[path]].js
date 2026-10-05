/* Serves quote-form attachments. Always a download, never rendered on our site:
   visitors choose the bytes, so an uploaded HTML page must not run on our origin. */
export async function onRequestGet({ params, env }) {
  const object = await env.ATTACHMENTS.get(params.path.join("/"));
  if (!object) return new Response("Not found", { status: 404 });
  return new Response(object.body, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${params.path[params.path.length - 1]}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
