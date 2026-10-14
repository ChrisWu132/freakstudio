// node --test test/event.test.mjs — functions/api/event.js with and without its D1 binding, no network.
import { test } from "node:test";
import assert from "node:assert/strict";
import { onRequestPost } from "../functions/api/event.js";

const SITE = "https://anvol.dev";
const post = (env, event = "page_view") => onRequestPost({
  env,
  request: new Request(`${SITE}/api/event`, {
    method: "POST", headers: { Origin: SITE }, body: JSON.stringify({ event, path: "/" })
  })
});

test("with no EVENTS binding an event is accepted and dropped, not a 500", async () => {
  assert.equal((await post({})).status, 204);
});

test("with the binding the event is written to D1", async () => {
  const rows = [];
  const EVENTS = { prepare: () => ({ bind: (...values) => ({ run: async () => { rows.push(values); } }) }) };
  assert.equal((await post({ EVENTS })).status, 204);
  assert.equal(rows.length, 1);
  assert.equal(rows[0][1], "page_view");
});

test("an unknown event is still refused", async () => {
  assert.equal((await post({}, "made_up")).status, 400);
});
