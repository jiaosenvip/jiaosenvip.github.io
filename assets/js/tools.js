/* tools.js：自页面内联脚本迁移，执行顺序与作用域保持不变。 */

function setStatus(id, message, isError = false) {
      const el = document.getElementById(id);
      if (!el) return;
      el.textContent = message;
      el.style.color = isError ? '#fca5a5' : '#93c5fd';
    }

    function copyText(id, statusId) {
      const el = document.getElementById(id);
      if (!el) return;
      const value = 'value' in el ? el.value : el.textContent;
      navigator.clipboard.writeText(value || '').then(() => {
        setStatus(statusId, '已复制到剪贴板');
      }).catch(err => {
        setStatus(statusId, '复制失败：' + err.message, true);
      });
    }

    function clearField(id, statusId) {
      const el = document.getElementById(id);
      if (el) el.value = '';
      setStatus(statusId, '已清空');
    }

    let codeMode = 'json';
    function escapeCode(value) { return String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])); }
    function highlightCode(value) {
      const escaped = escapeCode(value);
      return escaped.replace(/(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|(&quot;(?:\\.|[^&])*?&quot;|'(?:\\.|[^'])*')|\b(true|false|null|undefined|const|let|var|function|return|if|else|for|while|new|class|async|await|import|from|export)\b|\b\d+(?:\.\d+)?\b|([A-Za-z_$][\w$]*)(?=\s*:)/g,
        (match, comment, string, keyword, number, property) => comment ? `<span class="token-comment">${comment}</span>` : string ? `<span class="token-string">${string}</span>` : keyword ? `<span class="token-${['true','false','null','undefined'].includes(keyword) ? 'boolean' : 'keyword'}">${keyword}</span>` : number ? `<span class="token-number">${number}</span>` : `<span class="token-property">${property}</span>`);
    }
    function formatJavaScript(source, compact = false) {
      const tokens = [];
      const pattern = /\/\*[\s\S]*?\*\/|\/\/[^\r\n]*|(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(?:\d+(?:\.\d+)?|\.\d+)|(?:[A-Za-z_$][\w$]*)|(?:===|!==|>>>|\*\*=|&&=|\|\|=|\?\?=|=>|==|!=|<=|>=|\+\+|--|&&|\|\||\?\?|\+=|-=|\*=|\/=|%=|<<|>>|\*\*)|[^\s]/g;
      let match;
      while ((match = pattern.exec(String(source || '')))) tokens.push(match[0]);
      if (compact) {
        return tokens.reduce((result, token, index) => {
          const previous = tokens[index - 1] || '';
          const word = /^[\w$]/.test(token) && /[\w$]$/.test(previous);
          return result + (word ? ' ' : '') + token;
        }, '').trim();
      }
      const lines = [], stack = [], operators = new Set(['=', '==', '===', '!=', '!==', '+', '-', '*', '/', '%', '=>', '&&', '||', '??', '<', '>', '<=', '>=', '+=', '-=', '*=', '/=', 'in', 'instanceof']);
      let line = '', paren = 0, bracket = 0;
      const pad = () => '  '.repeat(stack.length);
      const flush = () => { if (line.trim()) lines.push(pad() + line.trim()); line = ''; };
      const append = (value, space = false) => { if (space && line && !line.endsWith(' ')) line += ' '; line += value; };
      tokens.forEach((token, index) => {
        const previous = tokens[index - 1] || '';
        const next = tokens[index + 1] || '';
        if (token.startsWith('//') || token.startsWith('/*')) { if (line.trim()) flush(); lines.push(pad() + token); return; }
        if (token === '{') { append('{', !!line); flush(); stack.push('{'); }
        else if (token === '}') { if (line.trim()) flush(); stack.pop(); line = '}'; if (next !== ';' && next !== ',' && next !== ')' && next !== ']') flush(); }
        else if (token === ';') { append(';'); flush(); }
        else if (token === ',') { append(','); if (stack.length && paren === 0 && bracket === 0) flush(); else append('', true); }
        else if (token === ':') { append(':'); append('', true); }
        else if (token === '(') { append('('); paren += 1; }
        else if (token === ')') { line = line.trimEnd(); append(')'); paren = Math.max(0, paren - 1); }
        else if (token === '[') { append('['); bracket += 1; }
        else if (token === ']') { line = line.trimEnd(); append(']'); bracket = Math.max(0, bracket - 1); }
        else if (token === '.') { line = line.trimEnd(); append('.'); }
        else if (operators.has(token)) { append(token, true); append('', true); }
        else {
          const needsSpace = !!line && ![' ', '(', '[', '.', '?'].some(mark => line.endsWith(mark)) && previous !== '!' && previous !== '~' && token !== '?' && next !== ':';
          append(token, needsSpace);
        }
      });
      flush();
      return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    }
    function updateCodePreview() { const value = document.getElementById('jsonInput').value; document.getElementById('codePreview').innerHTML = value ? highlightCode(value) : '格式化后的代码将在这里显示'; }
    function clearCodePreview() { document.getElementById('codePreview').textContent = '格式化后的代码将在这里显示'; }
    function detectCodeMode(source) {
      if (codeMode === 'js') return 'js';
      try { JSON.parse(source); return 'json'; } catch (_) { return 'js'; }
    }
    function syncCodeMode(mode) {
      codeMode = mode;
      document.querySelectorAll('[data-format-mode]').forEach(item => item.classList.toggle('active', item.dataset.formatMode === mode));
    }
    function formatJSON() {
      const el = document.getElementById('jsonInput');
      const mode = detectCodeMode(el.value);
      try {
        syncCodeMode(mode);
        el.value = mode === 'json' ? JSON.stringify(JSON.parse(el.value), null, 2) : formatJavaScript(el.value);
        updateCodePreview(); setStatus('jsonStatus', `${mode === 'json' ? 'JSON' : 'JavaScript'} 格式化成功`);
      } catch (err) { setStatus('jsonStatus', ''); }
    }
    function minifyJSON() {
      const el = document.getElementById('jsonInput');
      const mode = detectCodeMode(el.value);
      try {
        syncCodeMode(mode);
        el.value = mode === 'json' ? JSON.stringify(JSON.parse(el.value)) : formatJavaScript(el.value, true);
        updateCodePreview(); setStatus('jsonStatus', `${mode === 'json' ? 'JSON' : 'JavaScript'} 压缩成功`);
      } catch (err) { setStatus('jsonStatus', ''); }
    }


    function encodeBase64() {
      const el = document.getElementById('base64Input');
      try {
        el.value = btoa(unescape(encodeURIComponent(el.value)));
        setStatus('base64Status', 'Base64 编码成功');
      } catch (err) {
        setStatus('base64Status', '编码失败：' + err.message, true);
      }
    }

    function decodeBase64() {
      const el = document.getElementById('base64Input');
      try {
        el.value = decodeURIComponent(escape(atob(el.value.trim())));
        setStatus('base64Status', 'Base64 解码成功');
      } catch (err) {
        setStatus('base64Status', '解码失败：' + err.message, true);
      }
    }

    function encodeURL() {
      const el = document.getElementById('urlInput');
      el.value = encodeURIComponent(el.value);
      setStatus('urlStatus', 'URL 编码完成');
    }

    function decodeURL() {
      const el = document.getElementById('urlInput');
      try {
        el.value = decodeURIComponent(el.value);
        setStatus('urlStatus', 'URL 解码完成');
      } catch (err) {
        setStatus('urlStatus', 'URL 解码失败：' + err.message, true);
      }
    }

    function formatDate(date) {
      const pad = num => String(num).padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    }

    function timestampToDate() {
      const el = document.getElementById('timeInput');
      const value = el.value.trim();
      if (!value) return setStatus('timeStatus', '请输入时间戳或日期', true);
      const num = Number(value);
      if (!Number.isNaN(num)) {
        const ms = String(Math.trunc(num)).length <= 10 ? num * 1000 : num;
        el.value = formatDate(new Date(ms));
        return setStatus('timeStatus', '时间戳转换成功');
      }
      const parsed = new Date(value.replace(/-/g, '/'));
      if (Number.isNaN(parsed.getTime())) return setStatus('timeStatus', '无法识别输入内容', true);
      el.value = String(Math.floor(parsed.getTime() / 1000));
      setStatus('timeStatus', '日期已转为秒级时间戳');
    }

    function dateToTimestamp(unit) {
      const el = document.getElementById('timeInput');
      const value = el.value.trim();
      if (!value) return setStatus('timeStatus', '请输入日期时间', true);
      const date = new Date(value.replace(/-/g, '/'));
      if (Number.isNaN(date.getTime())) return setStatus('timeStatus', '日期格式无效', true);
      el.value = unit === 'ms' ? String(date.getTime()) : String(Math.floor(date.getTime() / 1000));
      setStatus('timeStatus', unit === 'ms' ? '已转为毫秒级时间戳' : '已转为秒级时间戳');
    }

    function toggleTimestampUnit() {
      const el = document.getElementById('timeInput');
      const value = el.value.trim();
      if (!/^\d+$/.test(value)) return setStatus('timeStatus', '请输入纯数字时间戳后再切换', true);
      el.value = value.length <= 10 ? String(Number(value) * 1000) : String(Math.floor(Number(value) / 1000));
      setStatus('timeStatus', '秒 / 毫秒切换完成');
    }

    function fillCurrentTimestamp(unit) {
      const now = Date.now();
      document.getElementById('timeInput').value = unit === 'ms' ? String(now) : String(Math.floor(now / 1000));
      setStatus('timeStatus', unit === 'ms' ? '已填入当前毫秒级时间戳' : '已填入当前秒级时间戳');
    }

    function md5Hex(text) {
      const bytes = Array.from(new TextEncoder().encode(text));
      const bitLength = bytes.length * 8;
      bytes.push(0x80);
      while (bytes.length % 64 !== 56) bytes.push(0);
      for (let i = 0; i < 8; i++) bytes.push((bitLength / (2 ** (8 * i))) & 0xff);
      let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
      const leftRotate = (x, n) => (x << n) | (x >>> (32 - n));
      const add = (...xs) => xs.reduce((a, b) => (a + b) | 0, 0);
      const k = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32));
      const s = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
      for (let offset = 0; offset < bytes.length; offset += 64) {
        const m = Array.from({ length: 16 }, (_, i) => {
          const p = offset + i * 4;
          return bytes[p] | (bytes[p + 1] << 8) | (bytes[p + 2] << 16) | (bytes[p + 3] << 24);
        });
        let a = a0, b = b0, c = c0, d = d0;
        for (let i = 0; i < 64; i++) {
          let f, g;
          if (i < 16) { f = (b & c) | (~b & d); g = i; }
          else if (i < 32) { f = (d & b) | (~d & c); g = (5 * i + 1) % 16; }
          else if (i < 48) { f = b ^ c ^ d; g = (3 * i + 5) % 16; }
          else { f = c ^ (b | ~d); g = (7 * i) % 16; }
          const shift = s[(i % 4) + (i < 16 ? 0 : i < 32 ? 4 : i < 48 ? 8 : 12)];
          const next = add(a, f, k[i], m[g]);
          a = d; d = c; c = b; b = add(b, leftRotate(next, shift));
        }
        a0 = add(a0, a); b0 = add(b0, b); c0 = add(c0, c); d0 = add(d0, d);
      }
      return [a0, b0, c0, d0].flatMap(word => Array.from({ length: 4 }, (_, i) => (word >>> (8 * i)) & 0xff))
        .map(byte => byte.toString(16).padStart(2, '0')).join('');
    }

    async function hashText(type) {
      const el = document.getElementById('hashInput');
      const value = el.value;
      if (!value) return setStatus('hashStatus', '请输入要计算的文本', true);
      try {
        if (type === 'MD5') {
          el.value = md5Hex(value);
          return setStatus('hashStatus', 'MD5 生成成功（纯本地计算）');
        }
        const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
        el.value = Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
        setStatus('hashStatus', 'SHA-256 生成成功');
      } catch (err) {
        setStatus('hashStatus', '哈希失败：' + err.message, true);
      }
    }

    function toUpperCaseText() {
      const el = document.getElementById('caseInput');
      el.value = el.value.toUpperCase();
      setStatus('caseStatus', '已转换为大写');
    }

    function toLowerCaseText() {
      const el = document.getElementById('caseInput');
      el.value = el.value.toLowerCase();
      setStatus('caseStatus', '已转换为小写');
    }

    function toSentenceCase() {
      const el = document.getElementById('caseInput');
      const text = el.value.trim();
      if (!text) return setStatus('caseStatus', '请输入文本', true);
      el.value = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
      setStatus('caseStatus', '已转换为首字母大写');
    }

    function toTitleCase() {
      const el = document.getElementById('caseInput');
      el.value = el.value.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
      setStatus('caseStatus', '已转换为单词首字母大写');
    }

    function getQRCodeStrategy(textLength) {
      if (textLength <= 120) {
        return { size: 220, level: QRCode.CorrectLevel.H, label: 'H（高纠错）' };
      }
      if (textLength <= 260) {
        return { size: 280, level: QRCode.CorrectLevel.H, label: 'H（高纠错）' };
      }
      if (textLength <= 500) {
        return { size: 340, level: QRCode.CorrectLevel.Q, label: 'Q（较高纠错）' };
      }
      return { size: 420, level: QRCode.CorrectLevel.M, label: 'M（中等纠错）' };
    }

    function generateQRCode() {
      const input = document.getElementById('qrInput').value.trim();
      const preview = document.getElementById('qrPreview');
      const note = document.getElementById('qrSizeNote');
      preview.innerHTML = '';
      if (!input) {
        preview.textContent = '暂无二维码';
        note.textContent = '当前未生成二维码';
        return setStatus('qrStatus', '请输入内容后再生成二维码', true);
      }
      const strategy = getQRCodeStrategy(input.length);
      new QRCode(preview, {
        text: input,
        width: strategy.size,
        height: strategy.size,
        colorDark: '#111827',
        colorLight: '#ffffff',
        correctLevel: strategy.level
      });
      note.textContent = input.length <= 120
        ? `当前字符数 ${input.length}，使用紧凑尺寸 ${strategy.size}×${strategy.size}，纠错级别 ${strategy.label}`
        : `当前字符数 ${input.length}，已自动调整为 ${strategy.size}×${strategy.size}，纠错级别 ${strategy.label}，优先保证可扫性`;
      setStatus('qrStatus', '二维码已生成');
    }

    function downloadQRCode() {
      const preview = document.getElementById('qrPreview');
      const canvas = preview.querySelector('canvas');
      const img = preview.querySelector('img');
      let dataUrl = '';
      if (canvas) dataUrl = canvas.toDataURL('image/png');
      else if (img) dataUrl = img.src;
      if (!dataUrl) return setStatus('qrStatus', '请先生成二维码再下载', true);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `qrcode_${Date.now()}.png`;
      link.click();
      setStatus('qrStatus', '二维码下载已触发');
    }

    function clearQRCode() {
      document.getElementById('qrInput').value = '';
      document.getElementById('qrPreview').textContent = '暂无二维码';
      document.getElementById('qrSizeNote').textContent = '当前未生成二维码';
      setStatus('qrStatus', '已清空');
    }

    function parseJWT() {
      const input = document.getElementById('jwtInput').value.trim();
      const output = document.getElementById('jwtOutput');
      if (!input) return setStatus('jwtStatus', '请输入 JWT', true);
      const parts = input.split('.');
      if (parts.length !== 3) return setStatus('jwtStatus', 'JWT 格式无效，应为 3 段', true);
      try {
        const header = JSON.parse(base64UrlDecode(parts[0]));
        const payload = JSON.parse(base64UrlDecode(parts[1]));
        if (payload.exp) payload.exp_readable = formatDate(new Date(payload.exp * 1000));
        if (payload.iat) payload.iat_readable = formatDate(new Date(payload.iat * 1000));
        output.value = 'Header:\n' + JSON.stringify(header, null, 2) + '\n\nPayload:\n' + JSON.stringify(payload, null, 2) + '\n\nSignature:\n' + parts[2];
        setStatus('jwtStatus', 'JWT 解析成功（未校验签名）');
      } catch (err) {
        setStatus('jwtStatus', 'JWT 解析失败：' + err.message, true);
      }
    }

    function clearJWTOutput() {
      const el = document.getElementById('jwtOutput');
      if (el) el.value = '';
    }

    function base64UrlDecode(str) {
      str = str.replace(/-/g, '+').replace(/_/g, '/');
      while (str.length % 4) str += '=';
      return decodeURIComponent(escape(atob(str)));
    }

    function testRegex() {
      const pattern = document.getElementById('regexPattern').value;
      const flags = document.getElementById('regexFlags').value;
      const input = document.getElementById('regexInput').value;
      const output = document.getElementById('regexOutput');
      if (!pattern) return setStatus('regexStatus', '请输入正则表达式', true);
      try {
        const regex = new RegExp(pattern, flags);
        const matches = [...input.matchAll(regex)];
        if (!matches.length) {
          output.value = '未匹配到任何结果';
          return setStatus('regexStatus', '匹配完成：0 项');
        }
        output.value = matches.map((m, idx) => `#${idx + 1}\n匹配内容: ${m[0]}\n位置: ${m.index}\n分组: ${JSON.stringify(m.slice(1))}`).join('\n\n');
        setStatus('regexStatus', `匹配完成：${matches.length} 项`);
      } catch (err) {
        setStatus('regexStatus', '正则错误：' + err.message, true);
      }
    }

    function regexReplace() {
      const pattern = document.getElementById('regexPattern').value;
      const flags = document.getElementById('regexFlags').value;
      const input = document.getElementById('regexInput').value;
      const output = document.getElementById('regexOutput');
      if (!pattern) return setStatus('regexStatus', '请输入正则表达式', true);
      try {
        const regex = new RegExp(pattern, flags);
        output.value = input.replace(regex, '[MATCH]');
        setStatus('regexStatus', '已将匹配结果替换为 [MATCH]');
      } catch (err) {
        setStatus('regexStatus', '正则错误：' + err.message, true);
      }
    }

    function clearRegex() {
      document.getElementById('regexPattern').value = '';
      document.getElementById('regexFlags').value = 'g';
      document.getElementById('regexInput').value = '';
      document.getElementById('regexOutput').value = '';
      setStatus('regexStatus', '已清空');
    }

    function generateUUIDs() {
      const count = Math.min(100, Math.max(1, Number(document.getElementById('uuidCount').value) || 1));
      const list = [];
      for (let i = 0; i < count; i++) list.push(crypto.randomUUID());
      document.getElementById('uuidOutput').value = list.join('\n');
      setStatus('uuidStatus', `已生成 ${count} 个 UUID`);
    }

    function parseURL() {
      const input = document.getElementById('urlParserInput').value.trim();
      const output = document.getElementById('urlParserOutput');
      if (!input) return setStatus('urlParserStatus', '请输入 URL', true);
      try {
        const url = new URL(input);
        const params = {};
        url.searchParams.forEach((value, key) => {
          if (Object.prototype.hasOwnProperty.call(params, key)) {
            params[key] = Array.isArray(params[key]) ? [...params[key], value] : [params[key], value];
          } else params[key] = value;
        });
        output.value = JSON.stringify({
          href: url.href, protocol: url.protocol, username: url.username,
          password: url.password ? '[已隐藏]' : '', host: url.host, hostname: url.hostname,
          port: url.port, pathname: url.pathname, search: url.search, hash: url.hash, params
        }, null, 2);
        setStatus('urlParserStatus', 'URL 解析成功');
      } catch (err) { setStatus('urlParserStatus', 'URL 格式无效：' + err.message, true); }
    }

    function encodeHTMLEntities() {
      const el = document.getElementById('htmlEntityInput');
      const holder = document.createElement('textarea');
      holder.textContent = el.value;
      el.value = holder.innerHTML;
      setStatus('htmlEntityStatus', 'HTML 编码完成');
    }

    function decodeHTMLEntities() {
      const el = document.getElementById('htmlEntityInput');
      const holder = document.createElement('textarea');
      holder.innerHTML = el.value;
      el.value = holder.value;
      setStatus('htmlEntityStatus', 'HTML 解码完成');
    }

    function generatePasswords() {
      const length = Math.min(128, Math.max(8, Number(document.getElementById('passwordLength').value) || 20));
      const count = Math.min(20, Math.max(1, Number(document.getElementById('passwordCount').value) || 1));
      const symbols = document.getElementById('passwordSymbols').checked;
      const groups = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789'];
      if (symbols) groups.push('!@#$%^&*_-+=');
      const alphabet = groups.join('');
      const randomIndex = max => {
        const values = new Uint32Array(1);
        const limit = Math.floor(0x100000000 / max) * max;
        do { crypto.getRandomValues(values); } while (values[0] >= limit);
        return values[0] % max;
      };
      const passwords = [];
      for (let i = 0; i < count; i++) {
        const chars = groups.map(group => group[randomIndex(group.length)]);
        while (chars.length < length) chars.push(alphabet[randomIndex(alphabet.length)]);
        for (let j = chars.length - 1; j > 0; j--) { const k = randomIndex(j + 1); [chars[j], chars[k]] = [chars[k], chars[j]]; }
        passwords.push(chars.join(''));
      }
      document.getElementById('passwordOutput').value = passwords.join('\n');
      setStatus('passwordStatus', `已生成 ${count} 个密码（仅在本地处理）`);
    }

    const searchInput = document.getElementById('toolSearch');
    const toolCards = Array.from(document.querySelectorAll('.tool'));
    const navItems = Array.from(document.querySelectorAll('.nav-item'));
    const emptyState = document.getElementById('emptyState');
    const toolCount = document.getElementById('toolCount');

    function updateToolFilter() {
      const keyword = searchInput.value.trim().toLowerCase();
      let visibleCount = 0;

      toolCards.forEach((card) => {
        const haystack = (card.dataset.search || '').toLowerCase() + ' ' + card.textContent.toLowerCase();
        const matched = !keyword || haystack.includes(keyword);
        card.classList.toggle('hidden', !matched);
        if (matched) visibleCount += 1;
      });

      navItems.forEach((item) => {
        const target = document.getElementById(item.dataset.target);
        const matched = target && !target.classList.contains('hidden');
        item.style.display = matched ? 'block' : 'none';
      });

      toolCount.textContent = keyword
        ? `搜索结果：${visibleCount} 个工具`
        : `共 ${toolCards.length} 个工具`;
      emptyState.style.display = visibleCount ? 'none' : 'block';
    }

    function syncActiveNav() {
      const visibleCards = toolCards.filter(card => !card.classList.contains('hidden'));
      let activeId = visibleCards.length ? visibleCards[0].id : '';
      const threshold = 160;
      for (const card of visibleCards) {
        const rect = card.getBoundingClientRect();
        if (rect.top <= threshold && rect.bottom >= threshold) {
          activeId = card.id;
          break;
        }
      }
      navItems.forEach(item => item.classList.toggle('active', item.dataset.target === activeId));
    }

    searchInput.addEventListener('input', () => {
      updateToolFilter();
      syncActiveNav();
    });

    window.addEventListener('scroll', syncActiveNav, { passive: true });
    navItems.forEach(item => item.addEventListener('click', () => {
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');
    }));

    updateToolFilter();
    syncActiveNav();

    // 工具导航：一次只显示一个工具，并同步地址锚点
    (() => {
      const grid = document.getElementById('toolGrid');
      const cards = Array.from(grid.querySelectorAll('.tool'));
      const navItems = Array.from(document.querySelectorAll('.nav-item'));
      const search = document.getElementById('toolSearch');
      const count = document.getElementById('toolCount');
      const empty = document.getElementById('emptyState');
      let activeId = '';

      function activate(id, updateHash = true) {
        const card = document.getElementById(id);
        if (!card || card.classList.contains('hidden')) return false;
        activeId = id;
        cards.forEach(item => item.classList.toggle('active', item === card));
        navItems.forEach(item => {
          const current = item.dataset.target === id;
          item.classList.toggle('active', current);
          item.setAttribute('aria-current', current ? 'true' : 'false');
        });
        if (updateHash && history.replaceState) history.replaceState(null, '', `#${id}`);
        return true;
      }

      function updateNavigation() {
        const keyword = search.value.trim().toLowerCase();
        cards.forEach(card => card.classList.remove('hidden'));
        const matched = navItems.filter(item => {
          const target = document.getElementById(item.dataset.target);
          const haystack = `${item.dataset.search || ''} ${target?.textContent || ''}`.toLowerCase();
          const visible = !keyword || haystack.includes(keyword);
          item.hidden = !visible;
          return visible;
        });
        count.textContent = keyword ? `搜索结果：${matched.length} 个工具` : `共 ${cards.length} 个工具`;
        empty.style.display = matched.length ? 'none' : 'block';
        if (matched.length && (!activeId || !matched.some(item => item.dataset.target === activeId))) {
          activate(matched[0].dataset.target, false);
        } else if (!matched.length) {
          cards.forEach(card => card.classList.remove('active'));
          navItems.forEach(item => item.classList.remove('active'));
        }
      }

      navItems.forEach(item => item.addEventListener('click', event => {
        event.preventDefault();
        activate(item.dataset.target);
      }));
      search.addEventListener('input', updateNavigation);

      const initial = location.hash.slice(1);
      cards.forEach(card => card.classList.remove('active', 'hidden'));
      activate(cards.some(card => card.id === initial) ? initial : 'tool-curl', false);
      updateNavigation();
    })();

    (() => {
      const input = document.getElementById('jsonInput');
      const status = document.getElementById('jsonStatus');
      document.querySelectorAll('[data-format-mode]').forEach(button => button.addEventListener('click', () => {
        codeMode = button.dataset.formatMode;
        document.querySelectorAll('[data-format-mode]').forEach(item => item.classList.toggle('active', item === button));
        input.placeholder = codeMode === 'json' ? 'JSON 示例：{"name":"test","age":18}' : 'JavaScript 示例：const greet = (name) => { return `Hello, ${name}`; };';
        status.textContent = `已切换到 ${codeMode === 'json' ? 'JSON' : 'JavaScript'} 模式`;
      }));
      input.addEventListener('input', updateCodePreview);
    })();

    (() => {
      const $ = id => document.getElementById(id); let active = 'requests'; let last = null;
      const examples = {
        json: `curl 'https://api.example.com/users?id=1' -H 'Accept: application/json' -H 'Content-Type: application/json' --data-raw '{"name":"Alice","active":true}'`,
        form: `curl 'https://api.example.com/login' -X POST -H 'Content-Type: application/x-www-form-urlencoded' --data 'username=alice&remember=true'`,
        multipart: `curl 'https://api.example.com/upload' -X POST -F 'file=@./demo.png' -F 'folder=avatars'`
      };
      const set = (id, text, error = false) => { $(id).textContent = text; $(id).classList.toggle('error', error); };
      function render() { if (!last) return; $('curlOutput').value = last.generated[active]; $('curlSummary').textContent = [`方法：${last.method}`, `URL：${last.url}`, `请求体：${last.bodyTypeLabel}`, `参数：${Object.keys(last.queryParams).length} 个 · 请求头：${Object.keys(last.headers).length} 个`, `Cookie：${Object.keys(last.cookies).length} 个 · 代理：${last.proxy || '无'}`].join('\n'); }
      function convert() { const input = $('curlInput').value.trim(); if (!input) return set('inputStatus', '请先输入 cURL 命令', true); try { last = CurlPython.parseAndGenerate(input); render(); set('inputStatus', '转换成功'); set('curlOutputStatus', '已生成 Python 代码'); } catch (error) { last = null; $('curlOutput').value = ''; set('inputStatus', '转换失败：' + error.message, true); } }
      $('convertBtn').onclick = convert; $('curlClearBtn').onclick = () => { $('curlInput').value = ''; $('curlOutput').value = ''; last = null; set('curlSummary', '等待解析 cURL…'); set('inputStatus', ''); set('curlOutputStatus', ''); };
      $('curlJsonExample').onclick = () => { $('curlInput').value = examples.json; convert(); }; $('curlFormExample').onclick = () => { $('curlInput').value = examples.form; convert(); }; $('curlMultipartExample').onclick = () => { $('curlInput').value = examples.multipart; convert(); };
      document.querySelectorAll('[data-curl-tab]').forEach(button => button.onclick = () => { active = button.dataset.curlTab; document.querySelectorAll('[data-curl-tab]').forEach(item => item.classList.toggle('active', item === button)); render(); });
      $('curlCopyBtn').onclick = async () => { if (!$('curlOutput').value) return set('curlOutputStatus', '当前没有可复制的代码', true); await navigator.clipboard.writeText($('curlOutput').value); set('curlOutputStatus', '已复制代码'); };
      $('curlDownloadBtn').onclick = () => { if (!$('curlOutput').value) return set('curlOutputStatus', '当前没有可下载的代码', true); const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([$('curlOutput').value], { type: 'text/x-python;charset=utf-8' })); link.download = `curl_to_${active}.py`; link.click(); set('curlOutputStatus', '已下载 ' + link.download); };
      $('curlRetryBtn').onclick = () => { if (!last) return set('curlOutputStatus', '请先完成转换', true); $('curlOutput').value = last.generated.retry; set('curlOutputStatus', '已显示 requests 重试模板'); };
      $('curlInput').addEventListener('keydown', event => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') convert(); });
    })();
