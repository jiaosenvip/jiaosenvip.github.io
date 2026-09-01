/* cURL to Python core: browser-safe, dependency-free. */
(function (root) {
  'use strict';

  const DATA_FLAGS = new Set(['-d', '--data', '--data-raw', '--data-binary', '--data-ascii']);

  function shellTokenize(input) {
    const tokens = [];
    let token = '';
    let quote = null;
    let escaped = false;
    let tokenStarted = false;
    const text = String(input || '').replace(/\\\r?\n/g, ' ');
    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i];
      if (escaped) {
        token += ch;
        escaped = false;
        tokenStarted = true;
        continue;
      }
      if (ch === '\\' && quote !== "'") {
        escaped = true;
        tokenStarted = true;
        continue;
      }
      if (quote) {
        if (ch === quote) quote = null;
        else token += ch;
        tokenStarted = true;
        continue;
      }
      if (ch === '"' || ch === "'") {
        quote = ch;
        tokenStarted = true;
      } else if (/\s/.test(ch)) {
        if (tokenStarted) {
          tokens.push(token);
          token = '';
          tokenStarted = false;
        }
      } else {
        token += ch;
        tokenStarted = true;
      }
    }
    if (escaped) token += '\\';
    if (quote) throw new Error('引号没有闭合：' + quote);
    if (tokenStarted) tokens.push(token);
    return tokens;
  }

  function addRepeated(target, key, value) {
    if (!Object.prototype.hasOwnProperty.call(target, key)) target[key] = value;
    else if (Array.isArray(target[key])) target[key].push(value);
    else target[key] = [target[key], value];
  }

  function parseCookieHeader(value, target) {
    String(value || '').split(';').forEach(function (part) {
      const index = part.indexOf('=');
      if (index > 0) target[part.slice(0, index).trim()] = part.slice(index + 1).trim();
    });
  }

  function parseForm(raw) {
    const result = {};
    new URLSearchParams(raw || '').forEach(function (value, key) {
      addRepeated(result, key, value);
    });
    return result;
  }

  function parseFormItem(item) {
    const index = String(item).indexOf('=');
    if (index < 0) return { name: String(item), value: '', file: false };
    const name = String(item).slice(0, index);
    const raw = String(item).slice(index + 1);
    const file = raw.startsWith('@');
    return { name: name, value: file ? raw.slice(1) : raw, file: file };
  }

  function tryJson(raw) {
    if (!raw || !String(raw).trim()) return null;
    try { return JSON.parse(raw); } catch (_) { return null; }
  }

  function parseCurl(input) {
    const tokens = shellTokenize(input);
    if (!tokens.length || !/^(curl|curl\.exe)$/i.test(tokens[0])) {
      throw new Error('请输入以 curl 开头的命令');
    }
    const result = {
      method: 'GET', url: '', headers: {}, cookies: {}, auth: null,
      dataParts: [], forms: [], insecure: false, compressed: false,
      proxy: '', userAgent: '', forceQuery: false, queryParams: {},
      bodyType: 'none', bodyTypeLabel: '无请求体', data: ''
    };
    let explicitMethod = false;
    let jsonFlag = false;
    const take = function (index, flag) {
      if (index + 1 >= tokens.length) throw new Error('参数缺少对应值：' + flag);
      return tokens[index + 1];
    };

    for (let i = 1; i < tokens.length; i += 1) {
      let flag = tokens[i];
      let inlineValue = null;
      const equals = flag.indexOf('=');
      if (equals > 0 && flag.startsWith('-')) {
        inlineValue = flag.slice(equals + 1);
        flag = flag.slice(0, equals);
      }
      if (flag === '--url') { result.url = inlineValue !== null ? inlineValue : take(i++, flag); continue; }
      if (!result.url && /^https?:\/\//i.test(flag)) { result.url = flag; continue; }
      if (!result.url && !flag.startsWith('-')) { result.url = flag; continue; }
      if (flag === '-X' || flag === '--request') { result.method = (inlineValue !== null ? inlineValue : take(i++, flag)).toUpperCase(); explicitMethod = true; continue; }
      if (flag === '-H' || flag === '--header') {
        const line = inlineValue !== null ? inlineValue : take(i++, flag);
        const index = line.indexOf(':');
        if (index < 1) throw new Error('请求头格式错误：' + line);
        const key = line.slice(0, index).trim();
        const value = line.slice(index + 1).trim();
        if (key.toLowerCase() === 'cookie') parseCookieHeader(value, result.cookies);
        else { result.headers[key] = value; if (key.toLowerCase() === 'user-agent') result.userAgent = value; }
        continue;
      }
      if (flag === '-A' || flag === '--user-agent') { result.userAgent = inlineValue !== null ? inlineValue : take(i++, flag); result.headers['User-Agent'] = result.userAgent; continue; }
      if (flag === '-b' || flag === '--cookie') { parseCookieHeader(inlineValue !== null ? inlineValue : take(i++, flag), result.cookies); continue; }
      if (flag === '-u' || flag === '--user') {
        const raw = inlineValue !== null ? inlineValue : take(i++, flag);
        const index = raw.indexOf(':');
        result.auth = { username: index < 0 ? raw : raw.slice(0, index), password: index < 0 ? '' : raw.slice(index + 1) };
        continue;
      }
      if (flag === '-x' || flag === '--proxy') { result.proxy = inlineValue !== null ? inlineValue : take(i++, flag); continue; }
      if (flag === '-k' || flag === '--insecure') { result.insecure = true; continue; }
      if (flag === '--compressed') { result.compressed = true; continue; }
      if (flag === '-G' || flag === '--get') { result.forceQuery = true; continue; }
      if (flag === '--json') {
        jsonFlag = true;
        result.headers['Content-Type'] = result.headers['Content-Type'] || 'application/json';
        result.headers['Accept'] = result.headers.Accept || 'application/json';
        result.dataParts.push(inlineValue !== null ? inlineValue : take(i++, flag));
        if (!explicitMethod) result.method = 'POST';
        continue;
      }
      if (DATA_FLAGS.has(flag) || flag === '--data-urlencode' || flag === '--url-query') {
        let value = inlineValue !== null ? inlineValue : take(i++, flag);
        if (flag === '--data-urlencode') {
          const index = value.indexOf('=');
          value = index < 0 ? encodeURIComponent(value) : encodeURIComponent(value.slice(0, index)) + '=' + encodeURIComponent(value.slice(index + 1));
        }
        result.dataParts.push(value);
        if (!explicitMethod && !result.forceQuery) result.method = 'POST';
        continue;
      }
      if (flag === '-F' || flag === '--form') { result.forms.push(inlineValue !== null ? inlineValue : take(i++, flag)); if (!explicitMethod) result.method = 'POST'; continue; }
      if (flag === '-e' || flag === '--referer') { result.headers.Referer = inlineValue !== null ? inlineValue : take(i++, flag); continue; }
      if (flag === '--max-time' || flag === '--connect-timeout' || flag === '-m') { result.timeout = inlineValue !== null ? inlineValue : take(i++, flag); continue; }
      if (flag.startsWith('-')) continue;
    }
    if (!result.url) throw new Error('未解析到 URL');
    result.data = result.dataParts.join('&');
    const url = new URL(result.url);
    url.searchParams.forEach(function (value, key) { addRepeated(result.queryParams, key, value); });
    if (result.forceQuery && result.data) {
      const extra = parseForm(result.data);
      Object.keys(extra).forEach(function (key) { addRepeated(result.queryParams, key, extra[key]); });
      result.data = '';
    }
    const contentType = Object.keys(result.headers).find(function (key) { return key.toLowerCase() === 'content-type'; });
    const type = contentType ? result.headers[contentType].toLowerCase() : '';
    if (result.forms.length) { result.bodyType = 'multipart'; result.bodyTypeLabel = 'multipart/form-data'; }
    else if (jsonFlag || tryJson(result.data) !== null) { result.bodyType = 'json'; result.bodyTypeLabel = 'JSON'; result.jsonBody = tryJson(result.data); }
    else if (result.data && (type.includes('application/x-www-form-urlencoded') || result.data.includes('='))) { result.bodyType = 'urlencoded'; result.bodyTypeLabel = 'application/x-www-form-urlencoded'; }
    else if (result.data) { result.bodyType = 'raw'; result.bodyTypeLabel = type || '原始文本'; }
    return result;
  }

  function pyString(value) { return JSON.stringify(String(value == null ? '' : value)); }
  function pyLiteral(value) {
    if (value === null) return 'None';
    if (value === true) return 'True';
    if (value === false) return 'False';
    if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'None';
    if (typeof value === 'string') return pyString(value);
    if (Array.isArray(value)) return '[' + value.map(pyLiteral).join(', ') + ']';
    if (typeof value === 'object') return '{' + Object.keys(value).map(function (key) { return pyString(key) + ': ' + pyLiteral(value[key]); }).join(', ') + '}';
    return 'None';
  }
  function pyJson(value) { return 'json.dumps(' + pyLiteral(value) + ', ensure_ascii=False, separators=(",", ":"))'; }
  function has(obj) { return obj && Object.keys(obj).length > 0; }
  function baseUrl(result) { const url = new URL(result.url); return url.origin + url.pathname; }
  function queryLines(result) {
    if (!has(result.queryParams)) return [];
    return ['params = ' + pyLiteral(result.queryParams), ''];
  }
  function payloadLines(result, asyncMode) {
    const lines = [];
    if (has(result.headers)) lines.push('headers = ' + pyLiteral(result.headers), '');
    if (has(result.cookies)) lines.push('cookies = ' + pyLiteral(result.cookies), '');
    if (result.proxy) lines.push('proxy = ' + pyString(result.proxy), '');
    if (result.auth) lines.push('auth = (' + pyString(result.auth.username) + ', ' + pyString(result.auth.password) + ')', '');
    if (result.bodyType === 'json') lines.push('json_data = ' + pyLiteral(result.jsonBody), '');
    else if (result.bodyType === 'urlencoded') lines.push('form_data = ' + pyLiteral(parseForm(result.data)), '');
    else if (result.bodyType === 'multipart') {
      const values = {}; const files = {};
      result.forms.map(parseFormItem).forEach(function (item) { (item.file ? files : values)[item.name] = item.value; });
      if (asyncMode) {
        lines.push('form_data = aiohttp.FormData()');
        Object.keys(values).forEach(function (key) { lines.push('form_data.add_field(' + pyString(key) + ', ' + pyString(values[key]) + ')'); });
        Object.keys(files).forEach(function (key) { lines.push('form_data.add_field(' + pyString(key) + ', open(' + pyString(files[key]) + ', "rb"))'); });
        lines.push('');
      } else {
        lines.push('form_data = ' + pyLiteral(values), '');
        if (has(files)) {
          lines.push('files = {');
          Object.keys(files).forEach(function (key) { lines.push('    ' + pyString(key) + ': open(' + pyString(files[key]) + ', "rb"),'); });
          lines.push('}', '');
        }
      }
    } else if (result.data) lines.push('body = ' + pyString(result.data), '');
    if (asyncMode && result.auth) lines.push('basic_auth = aiohttp.BasicAuth(' + pyString(result.auth.username) + ', ' + pyString(result.auth.password) + ')', '');
    return lines;
  }
  function requestArgs(result, lib) {
    const args = lib === 'aiohttp' ? [pyString(result.method), 'url'] : ['method=' + pyString(result.method), 'url=url'];
    if (has(result.queryParams)) args.push('params=params');
    if (has(result.headers)) args.push('headers=headers');
    if (has(result.cookies)) args.push('cookies=cookies');
    if (result.bodyType === 'json') args.push('json=json_data');
    else if (result.bodyType === 'urlencoded') args.push('data=form_data');
    else if (result.bodyType === 'multipart') {
      args.push('data=form_data');
      if (lib !== 'aiohttp' && result.forms.some(function (item) { return parseFormItem(item).file; })) args.push('files=files');
    }
    else if (result.data) args.push(lib === 'httpx' ? 'content=body' : 'data=body');
    if (result.auth) args.push(lib === 'aiohttp' ? 'auth=basic_auth' : 'auth=auth');
    if (result.proxy && lib !== 'httpx') args.push('proxy=proxy');
    return args;
  }
  function callBlock(result, lib, indent) {
    const pad = indent || '';
    return [pad + ('response = ' + (lib === 'aiohttp' ? 'await session.request(' : 'client.request(')), pad + '    ' + requestArgs(result, lib).join(',\n' + pad + '    '), pad + ')'];
  }
  function buildRequests(result, lib) {
    const imports = lib === 'requests' ? ['import requests'] : ['from curl_cffi import requests'];
    const lines = imports.concat(['', 'url = ' + pyString(baseUrl(result)), '']);
    if (has(result.queryParams)) lines.push.apply(lines, queryLines(result));
    lines.push.apply(lines, payloadLines(result, false));
    if (result.proxy) lines.push('proxies = {"http": proxy, "https": proxy}', '');
    if (result.insecure) lines.push('# cURL --insecure: disable TLS verification', '');
    const args = requestArgs(result, lib).map(function (arg) { return arg === 'proxy=proxy' ? 'proxies=proxies' : arg; });
    if (result.insecure) args.push('verify=False');
    lines.push('response = requests.request(', '    ' + args.join(',\n    '), ')', '', 'print(response.status_code)', 'print(response.text)');
    return lines.join('\n');
  }
  function buildHttpx(result) {
    const lines = ['import httpx', ''];
    if (result.bodyType === 'json' || has(result.queryParams)) lines.unshift('import json', '');
    lines.push('url = ' + pyString(baseUrl(result)), '');
    if (has(result.queryParams)) lines.push.apply(lines, queryLines(result));
    lines.push.apply(lines, payloadLines(result, false));
    const options = []; if (result.insecure) options.push('verify=False'); if (result.proxy) options.push('proxy=proxy');
    lines.push('with httpx.Client(' + options.join(', ') + ') as client:', '    response = client.request(');
    lines.push('        ' + requestArgs(result, 'httpx').filter(function (arg) { return arg !== 'proxy=proxy'; }).join(',\n        '), '    )', '    print(response.status_code)', '    print(response.text)');
    return lines.join('\n');
  }
  function buildAiohttp(result) {
    const lines = ['import asyncio', 'import aiohttp'];
    if (result.insecure) lines.push('import ssl');
    lines.push('', 'url = ' + pyString(baseUrl(result)), '');
    if (has(result.queryParams)) lines.push.apply(lines, queryLines(result));
    lines.push.apply(lines, payloadLines(result, true));
    lines.push('async def main():');
    if (result.insecure) lines.push('    connector = aiohttp.TCPConnector(ssl=False)');
    else lines.push('    connector = aiohttp.TCPConnector()');
    lines.push('    async with aiohttp.ClientSession(connector=connector) as session:');
    const args = requestArgs(result, 'aiohttp');
    lines.push('        async with session.request(', '            ' + args.join(',\n            '), '        ) as response:', '            print(response.status)', '            print(await response.text())', '', "if __name__ == '__main__':", '    asyncio.run(main())');
    return lines.join('\n');
  }
  function buildRetry(result) {
    const lines = ['import time', 'import requests', '', 'URL = ' + pyString(result.url), ''];
    if (has(result.headers)) lines.push('HEADERS = ' + pyLiteral(result.headers), '');
    lines.push('def request_with_retry(max_retries=3, delay=1.5):', '    last_error = None', '    for attempt in range(1, max_retries + 1):', '        try:', '            response = requests.request(', '                method=' + pyString(result.method) + ',', '                url=URL,', '                headers=HEADERS if "HEADERS" in globals() else None,', '                timeout=30,', '            )', '            response.raise_for_status()', '            return response', '        except requests.RequestException as exc:', '            last_error = exc', '            if attempt == max_retries: raise', '            time.sleep(delay * attempt)', '    raise last_error', '', 'response = request_with_retry()', 'print(response.status_code)', 'print(response.text)');
    return lines.join('\n');
  }
  function generateAll(result) {
    return { requests: buildRequests(result, 'requests'), curl_cffi: buildRequests(result, 'curl_cffi'), httpx: buildHttpx(result), aiohttp: buildAiohttp(result), retry: buildRetry(result) };
  }
  function parseAndGenerate(input) { const parsed = parseCurl(input); parsed.generated = generateAll(parsed); return parsed; }

  const api = { shellTokenize, parseCurl, parseForm, parseFormItem, pyLiteral, generateAll, parseAndGenerate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.CurlPython = api;
}(typeof window !== 'undefined' ? window : globalThis));
