import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = (file) => fs.readFileSync(new URL(file, import.meta.url), 'utf8');
const html = read('../site/index.html');
// The live region must survive hiding the submitted form, for sighted and
// screen-reader visitors. Check actual document nesting, not JS string output.
const tags = html.match(/<\/?[a-z][^>]*>/gi);
const stack = [];
let found = false;
for (const tag of tags) {
  const name = tag.match(/^<\/?([a-z0-9]+)/i)[1].toLowerCase();
  if (tag.startsWith('</')) { stack.splice(stack.lastIndexOf(name)); continue; }
  if (tag.includes('id="wl-status"')) {
    found = true;
    assert.equal(stack.includes('form'), false, 'confirmation lives outside the hidden form');
    assert.match(tag, /role="status"/);
  }
  if (!['meta', 'link', 'input', 'img', 'br', 'hr', 'path', 'circle', 'line'].includes(name)) stack.push(name);
}
assert.equal(found, true);

for (const outcome of [201, 409, 500, 'network']) {
  const nodes = Object.fromEntries(['waitlist-form', 'wl-email', 'wl-zip', 'wl-submit', 'wl-status'].map(id => [id, {
    value: id === 'wl-email' ? 'test@example.com' : '', hidden: false,
    addEventListener(type, fn) { this.submit = fn; },
    querySelector: () => ({ value: 'got_logs' }),
  }]));
  vm.runInNewContext(read('../site/waitlist.js'), {
    window: {}, document: { getElementById: (id) => nodes[id] },
    fetch: async () => {
      if (outcome === 'network') throw new Error('offline');
      return { ok: outcome === 201, status: outcome, text: async () => '' };
    },
  });
  nodes['waitlist-form'].submit({ preventDefault() {} });
  await new Promise(resolve => setImmediate(resolve));
  const success = outcome === 201 || outcome === 409;
  assert.equal(nodes['waitlist-form'].hidden, success);
  assert.equal(nodes['wl-status'].hidden, false);
  assert.match(nodes['wl-status'].textContent, success ? /You're on the list/ : /try again/);
  if (!success) assert.equal(nodes['wl-submit'].disabled, false, 'errors permit retry');
}
console.log('ALL PASS: visible waitlist success, duplicate, server failure and offline retry');
