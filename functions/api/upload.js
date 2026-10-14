/* Stores one quote-form attachment in R2 and returns its download link.
   Limits match the form hint in index.html; js/main.js checks them first. */
const MAX_BYTES = 20 * 1024 * 1024;
/* Room for the multipart framing around the file. A bigger body is refused before it is read. */
const MAX_BODY = MAX_BYTES + 64 * 1024;
/* What the forms ask for: CAD, PCB/Gerber, BOM, documents, photos, short videos, archives.
   Same list as the accept attribute on the file inputs in index.html and brief/index.html. */
const EXTENSIONS = new Set(("step stp iges igs stl obj 3mf f3d sldprt sldasm slddrw ipt iam x_t x_b dwg dxf 3dm fcstd " +
  "gbr gtl gbl gts gbs gto gbo gko drl kicad_pcb kicad_sch kicad_pro brd sch pcbdoc schdoc prjpcb " +
  "csv xls xlsx ods txt pdf doc docx ppt pptx key rtf md " +
  "jpg jpeg png heic heif webp gif bmp tif tiff svg mp4 mov webm zip rar 7z tar gz tgz").split(" "));

/* Cheap barrier, no paid service: only our own pages may upload. Browsers always send Origin on a POST;
   a script can forge it, so this stops drive-by use from other sites, not a determined attacker. */
function fromOurPage(request) {
  const self = new URL(request.url).origin;
  const origin = request.headers.get("Origin");
  if (origin) return origin === self;
  const referer = request.headers.get("Referer") || "";
  return referer.startsWith(self + "/");
}

export async function onRequestPost({ request, env }) {
  if (!fromOurPage(request)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const length = Number(request.headers.get("Content-Length"));
  if (!length) return Response.json({ error: "Content-Length required" }, { status: 411 });
  if (length > MAX_BODY) return Response.json({ error: "File over 20 MB" }, { status: 413 });
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return Response.json({ error: "No file" }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: "File over 20 MB" }, { status: 413 });
  const ext = file.name.includes(".") ? file.name.split(".").pop().toLowerCase() : "";
  if (!EXTENSIONS.has(ext)) return Response.json({ error: "File type not accepted" }, { status: 415 });
  const name = file.name.replace(/[^\w.\-]+/g, "_").slice(-120) || "file";
  const key = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}/${name}`;
  await env.ATTACHMENTS.put(key, file.stream(), { httpMetadata: { contentType: file.type || "application/octet-stream" } });
  return Response.json({ url: `${new URL(request.url).origin}/files/${key}` });
}
