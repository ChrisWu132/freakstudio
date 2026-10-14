// node --test test/upload.test.mjs — functions/api/upload.js against a fake R2 binding, no network.
import { test } from "node:test";
import assert from "node:assert/strict";
import { onRequestPost } from "../functions/api/upload.js";

const SITE = "https://anvol.dev";

function call({ name = "board.zip", bytes = 10, headers = {}, length } = {}) {
  const puts = [];
  const env = { ATTACHMENTS: { put: async (key) => { puts.push(key); } } };
  const body = new FormData();
  body.append("file", new File([new Uint8Array(bytes)], name));
  const probe = new Request(`${SITE}/api/upload`, { method: "POST", body });
  const h = new Headers(probe.headers);
  for (const [k, v] of Object.entries({ Origin: SITE, ...headers })) v === null ? h.delete(k) : h.set(k, v);
  return probe.arrayBuffer().then((buf) => {
    h.set("Content-Length", String(length ?? buf.byteLength));
    const request = new Request(`${SITE}/api/upload`, { method: "POST", body: buf, headers: h });
    return onRequestPost({ request, env }).then((res) => ({ res, puts }));
  });
}

test("a CAD archive from our own page is stored and linked", async () => {
  const { res, puts } = await call();
  assert.equal(res.status, 200);
  assert.equal(puts.length, 1);
  assert.match((await res.json()).url, /^https:\/\/anvol\.dev\/files\/\d{4}-\d\d-\d\d\/[0-9a-f-]{36}\/board\.zip$/);
});

test("another site's page is refused", async () => {
  const { res, puts } = await call({ headers: { Origin: "https://evil.example" } });
  assert.equal(res.status, 403);
  assert.equal(puts.length, 0);
});

test("no Origin falls back to Referer", async () => {
  assert.equal((await call({ headers: { Origin: null, Referer: `${SITE}/brief/` } })).res.status, 200);
  assert.equal((await call({ headers: { Origin: null, Referer: "https://anvol.dev.evil.example/" } })).res.status, 403);
  assert.equal((await call({ headers: { Origin: null } })).res.status, 403);
});

test("an oversized body is refused by Content-Length before it is parsed", async () => {
  const { res, puts } = await call({ length: 21 * 1024 * 1024 });
  assert.equal(res.status, 413);
  assert.equal(puts.length, 0);
});

test("a file type the form does not ask for is refused", async () => {
  for (const name of ["page.html", "setup.exe", "noext"]) {
    const { res, puts } = await call({ name });
    assert.equal(res.status, 415, name);
    assert.equal(puts.length, 0);
  }
});

test("extension check ignores case", async () => {
  assert.equal((await call({ name: "Photo.JPG" })).res.status, 200);
});
