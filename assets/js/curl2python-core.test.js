const assert = require('assert');
const { parseAndGenerate, pyLiteral } = require('./curl2python-core.js');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

function compile(code) {
  const file = path.join(os.tmpdir(), 'curl2python-regression.py');
  fs.writeFileSync(file, code, 'utf8');
  execFileSync('python3', ['-m', 'py_compile', file], { stdio: 'pipe' });
}

assert.equal(pyLiteral({ active: true, deleted: false, value: null }), '{"active": True, "deleted": False, "value": None}');
const json = parseAndGenerate(`curl 'https://example.test/api?a=1&a=2' -H 'Content-Type: application/json' --data-raw '{"active":true,"value":null}'`);
assert.deepEqual(json.queryParams, { a: ['1', '2'] });
assert.equal(json.bodyType, 'json');
assert(json.generated.requests.includes('method="POST"'));
assert(json.generated.requests.includes('url=url'));
assert(!json.generated.requests.includes('response = requests.request(\n    url,'));
Object.values(json.generated).forEach(compile);

const form = parseAndGenerate(`curl.exe --url https://example.test/login -X POST --data-urlencode 'name=张三' --data 'remember=true'`);
assert.equal(form.bodyType, 'urlencoded');
compile(form.generated.requests);

const multi = parseAndGenerate(`curl https://example.test/upload -F 'file=@./demo.png' -F 'folder=avatars'`);
assert.equal(multi.bodyType, 'multipart');
compile(multi.generated.requests);
assert(multi.generated.aiohttp.includes('aiohttp.FormData()'));
assert(!multi.generated.aiohttp.includes('files=files'));
compile(multi.generated.aiohttp);

const options = parseAndGenerate(`curl https://example.test -A 'Demo/1.0' -b 'sid=abc; theme=light' -u 'alice:secret' -x http://127.0.0.1:8080 -k`);
assert.equal(options.userAgent, 'Demo/1.0');
assert.equal(options.cookies.sid, 'abc');
compile(options.generated.requests);
compile(options.generated.httpx);

console.log('curl2python regression tests: PASS');
