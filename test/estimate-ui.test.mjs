// Offline visitor flows: no photo requests, lead inserts or analytics reach prod.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = (file) => fs.readFileSync(new URL(file, import.meta.url), 'utf8');
const fixture = JSON.parse(read('./fixtures/estimate-log.contract.json'));
const flush = () => new Promise((resolve) => setImmediate(resolve));

function page(response = fixture.example_success) {
  const nodes = new Map();
  function node(id) {
    if (!nodes.has(id)) nodes.set(id, {
      value: '', checked: false, hidden: ['est-result', 'est-lead'].includes(id),
      innerHTML: '', textContent: '', handlers: {},
      addEventListener(type, fn) { (this.handlers[type] ||= []).push(fn); },
      emit(type) { for (const fn of this.handlers[type] || []) fn({ preventDefault() {} }); },
      querySelector() { return null; },
    });
    return nodes.get(id);
  }
  node('est-species').value = 'black walnut';
  node('est-species').options = [{ value: 'black walnut' }, { value: 'other' }];
  node('est-diameter').value = '24';
  node('est-length').value = '12';
  node('est-clear').checked = true;
  const radios = { rule: 'doyle', defects: '0', where: 'standing', difficulty: '0.3' };
  const events = [], requests = [];
  const context = vm.createContext({
    window: { lbTrack: (name) => events.push(name) },
    document: {
      getElementById: node,
      querySelector(selector) {
        const name = selector.match(/name="([^"]+)"/)[1];
        return { value: radios[name] };
      },
      createElement: () => ({ getContext: () => ({ drawImage() {} }), toDataURL: () => 'data:image/jpeg;base64,test' }),
    },
    Image: class { width = 10; height = 10; set src(value) { this.onload(); } },
    URL: { createObjectURL: () => 'blob:test', revokeObjectURL() {} },
    fetch: async (url, options) => {
      requests.push(JSON.parse(options.body));
      return { ok: true, json: async () => response };
    },
    setTimeout: () => 1, clearTimeout() {},
  });
  vm.runInContext(read('../site/log-model.js'), context);
  context.window.LogModel = context.LogModel;
  vm.runInContext(read('../site/estimate.js'), context);
  return { node, events, requests };
}

const manual = page();
assert.equal(manual.node('est-result').hidden, false, 'default example still renders');
assert.equal(manual.node('est-lead').hidden, true, 'default does not ask for a lead');
assert.deepEqual(manual.events, [], 'default does not count as visitor input');
manual.node('est-diameter').value = '40';
manual.node('est-form').emit('input');
assert.equal(manual.node('est-lead').hidden, false, 'real input reveals the lead');
assert.match(manual.node('est-result').innerHTML, /href="https:\/\/timber.bid\/lumber\/sell"/);
manual.node('est-length').value = '';
manual.node('est-form').emit('input');
assert.equal(manual.node('est-result').hidden, true);
assert.equal(manual.node('est-lead').hidden, true, 'cleared measurements hide the lead');
manual.node('est-length').value = '12';
manual.node('est-form').emit('input');
assert.equal(manual.node('est-lead').hidden, false);
assert.deepEqual(manual.events, ['estimate_shown'], 'manual beacon fires only once');
assert.deepEqual(manual.requests, [], 'manual edits never save photo confirmations');

for (const [response, expectedHidden] of [[fixture.example_success, false], [fixture.example_reject, true]]) {
  const photo = page(response);
  photo.node('shot-file').files = [{}];
  photo.node('shot-file').emit('change');
  await flush();
  assert.equal(photo.node('est-lead').hidden, true, 'selecting a photo alone is not an estimate');
  photo.node('est-photo-go').emit('click');
  await flush();
  assert.equal(photo.node('est-lead').hidden, expectedHidden, 'only successful photo results reveal the lead');
  assert.equal(photo.events.includes('estimate_shown'), false, 'photo results are not manual events');
  assert.equal(photo.requests.length, 1);
}
console.log('ALL PASS: estimate input, reset, selling link, photo success and rejection');
