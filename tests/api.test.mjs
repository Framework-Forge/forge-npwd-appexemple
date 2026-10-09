import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function loadApi(fetchImpl, inGame = true) {
  const timers = new Set();
  let cleared = 0;
  const window = { ...(inGame ? { invokeNative() {} } : {}),
    setTimeout: () => { const id = timers.size + 1; timers.add(id); return id; },
    clearTimeout: id => { timers.delete(id); cleared++; },
  };
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(root, 'src/api.ts'), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const sandbox = { module, exports: module.exports, window, fetch: fetchImpl, AbortController, Date,
    require: name => { assert.equal(name, './contracts'); return { RESOURCE_NAME: 'forge-npwd-appexemple', SUMMARY_CALLBACK: 'getSummary' }; },
  };
  vm.runInNewContext(code, sandbox);
  return { api: module.exports, timers, cleared: () => cleared };
}
test('browser preview never requests a FiveM callback', async () => {
  const { api } = loadApi(() => { throw Error('must not fetch'); }, false);
  assert.equal((await api.getSummary()).online, 42);
});
test('callback targets app resource, posts JSON and clears timeout', async () => {
  const { api, timers, cleared } = loadApi(async (url, options) => {
    assert.equal(url, 'https://forge-npwd-appexemple/getSummary');
    assert.equal(options.method, 'POST'); assert.equal(options.body, '{}');
    assert.ok(options.signal instanceof AbortSignal);
    return { ok: true, json: async () => ({ ok: true, data: { online: 7 } }) };
  });
  assert.equal((await api.getSummary()).online, 7);
  assert.equal(timers.size, 0); assert.equal(cleared(), 1);
});
test('simultaneous app/widget reads share one request and short cache', async () => {
  let count = 0;
  const { api } = loadApi(async () => {
    count++; await new Promise(resolve => setTimeout(resolve, 5));
    return { ok: true, json: async () => ({ ok: true, data: { online: 12 } }) };
  });
  const results = await Promise.all([api.getSummary(), api.getSummary(), api.getSummary()]);
  assert.equal(count, 1); assert.ok(results.every(result => result.online === 12));
  await api.getSummary(); assert.equal(count, 1);
});
test('server errors propagate and failed requests can be retried', async () => {
  let count = 0;
  const { api, timers } = loadApi(async () => ({ ok: true, json: async () => ++count === 1
    ? { ok: false, error: 'NO_ACTIVE_DEVICE' } : { ok: true, data: { online: 3 } } }));
  await assert.rejects(api.getSummary(), /NO_ACTIVE_DEVICE/);
  assert.equal((await api.getSummary()).online, 3); assert.equal(timers.size, 0);
});
test('HTTP and network failures clear timers', async () => {
  const badHttp = loadApi(async () => ({ ok: false, status: 503 }));
  await assert.rejects(badHttp.api.getSummary(), /HTTP_503/); assert.equal(badHttp.timers.size, 0);
  const badNetwork = loadApi(async () => { throw new Error('network'); });
  await assert.rejects(badNetwork.api.getSummary(), /network/); assert.equal(badNetwork.timers.size, 0);
});
test('federation, Lua and TypeScript identifiers remain aligned', () => {
  const read = file => fs.readFileSync(path.join(root, file), 'utf8');
  for (const file of ['src/contracts.ts', 'client/main.lua', 'server/main.lua']) assert.ok(read(file).includes('forge-npwd-appexemple'), file);
  assert.match(read('vite.config.ts'), /'\.\/config': '\.\/forge-npwd\.config\.ts'/);
  assert.match(read('fxmanifest.lua'), /web\/dist\/index.html/);
  assert.match(read('forge-npwd.config.ts'), /homeWidgets/);
  assert.doesNotMatch(read('src/App.tsx'), /BrowserRouter|createRoot/);
});
