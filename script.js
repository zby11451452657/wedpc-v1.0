/* ============================================================
   Web Desktop OS — Windows & macOS Simulator
   script.js
   ============================================================ */

(function () {
  'use strict';

  /* ===== State ===== */
  const state = {
    theme: 'windows',
    wallpaperIndex: 0,
    zCounter: 100,
    windows: {},
    winIdCounter: 0,
  };

  const wallpapers = [
    'linear-gradient(135deg, #0078D4 0%, #00BCF2 40%, #50E6FF 70%, #A8F0FF 100%)',
    'linear-gradient(160deg, #FF6B9D 0%, #C06EFF 25%, #7C8CFF 50%, #5AC8FA 75%, #98F5D9 100%)',
    'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
  ];

  /* ===== Utility ===== */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function showToast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.classList.remove('show'); }, 2200);
  }

  /* ===== Clock ===== */
  function updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const winClock = $('#win-clock');
    if (winClock) {
      $('.clock-time', winClock).textContent = h + ':' + m;
      $('.clock-date', winClock).textContent =
        now.getFullYear() + '/' + (now.getMonth() + 1) + '/' + now.getDate();
    }
    const macClock = $('#mac-clock');
    if (macClock) {
      const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      macClock.textContent = days[now.getDay()] + ' ' + h + ':' + m;
    }
  }

  /* ===== Window Manager ===== */
  function createWindow(appId) {
    const app = APPS[appId];
    if (!app) return;

    // If app already open, focus it (single instance for most apps)
    for (const wid in state.windows) {
      if (state.windows[wid].appId === appId && !app.allowMultiple) {
        focusWindow(wid);
        if (state.windows[wid].el.classList.contains('minimized')) {
          state.windows[wid].el.classList.remove('minimized');
        }
        return wid;
      }
    }

    const id = 'win-' + (++state.winIdCounter);
    const winEl = el('div', 'window');
    winEl.id = id;

    const w = app.width || 500;
    const h = app.height || 400;
    const offset = (state.winIdCounter % 8) * 28;
    const left = Math.max(20, (window.innerWidth - w) / 2 + offset - 100);
    const top = Math.max(40, (window.innerHeight - h) / 2 + offset - 80);

    winEl.style.width = w + 'px';
    winEl.style.height = h + 'px';
    winEl.style.left = left + 'px';
    winEl.style.top = top + 'px';

    // Title bar
    const titlebar = el('div', 'window-titlebar');
    const isMac = state.theme === 'macos';

    if (isMac) {
      const controls = el('div', 'window-controls');
      const closeBtn = el('button', 'mac-ctrl-btn close', '<svg viewBox="0 0 10 10"><path d="M2 2l6 6M8 2l-6 6" stroke="rgba(0,0,0,0.5)" stroke-width="1.5"/></svg>');
      const minBtn = el('button', 'mac-ctrl-btn minimize', '<svg viewBox="0 0 10 10"><path d="M2 5h6" stroke="rgba(0,0,0,0.5)" stroke-width="1.5"/></svg>');
      const maxBtn = el('button', 'mac-ctrl-btn maximize', '<svg viewBox="0 0 10 10"><path d="M3 3h4v4H3z" fill="none" stroke="rgba(0,0,0,0.5)" stroke-width="1"/></svg>');
      closeBtn.addEventListener('click', function (e) { e.stopPropagation(); closeWindow(id); });
      minBtn.addEventListener('click', function (e) { e.stopPropagation(); minimizeWindow(id); });
      maxBtn.addEventListener('click', function (e) { e.stopPropagation(); toggleMaximize(id); });
      controls.appendChild(closeBtn);
      controls.appendChild(minBtn);
      controls.appendChild(maxBtn);
      titlebar.appendChild(controls);
      titlebar.appendChild(el('div', 'window-title', app.title));
    } else {
      const titleDiv = el('div', 'window-title');
      titleDiv.innerHTML = '<div class="win-title-icon ' + app.icon + '"></div>' + app.title;
      titlebar.appendChild(titleDiv);
      const controls = el('div', 'window-controls');
      const minBtn = el('button', 'win-ctrl-btn minimize', '<svg viewBox="0 0 12 12"><path d="M2 6h8" stroke="currentColor" stroke-width="1.2"/></svg>');
      const maxBtn = el('button', 'win-ctrl-btn maximize', '<svg viewBox="0 0 12 12"><rect x="2" y="2" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>');
      const closeBtn = el('button', 'win-ctrl-btn close', '<svg viewBox="0 0 12 12"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.2"/></svg>');
      minBtn.addEventListener('click', function (e) { e.stopPropagation(); minimizeWindow(id); });
      maxBtn.addEventListener('click', function (e) { e.stopPropagation(); toggleMaximize(id); });
      closeBtn.addEventListener('click', function (e) { e.stopPropagation(); closeWindow(id); });
      controls.appendChild(minBtn);
      controls.appendChild(maxBtn);
      controls.appendChild(closeBtn);
      titlebar.appendChild(controls);
    }

    // Drag logic
    titlebar.addEventListener('mousedown', function (e) {
      if (e.target.closest('button')) return;
      if (winEl.classList.contains('maximized')) return;
      focusWindow(id);
      const startX = e.clientX;
      const startY = e.clientY;
      const origLeft = winEl.offsetLeft;
      const origTop = winEl.offsetTop;
      function onMove(ev) {
        winEl.style.left = (origLeft + ev.clientX - startX) + 'px';
        winEl.style.top = clamp(origTop + ev.clientY - startY, 0, window.innerHeight - 60) + 'px';
      }
      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });

    winEl.addEventListener('mousedown', function () { focusWindow(id); });

    // Body
    const body = el('div', 'window-body');
    winEl.appendChild(titlebar);
    winEl.appendChild(body);

    $('#windows-container').appendChild(winEl);
    app.render(body, id);

    state.windows[id] = { el: winEl, appId: appId, state: 'normal' };
    focusWindow(id);
    updateTaskbarIndicators();
    return id;
  }

  function focusWindow(id) {
    const w = state.windows[id];
    if (!w) return;
    state.zCounter++;
    w.el.style.zIndex = state.zCounter;
    state.activeWindow = id;
    updateTaskbarIndicators();
  }

  function closeWindow(id) {
    const w = state.windows[id];
    if (!w) return;
    w.el.classList.add('closing');
    setTimeout(function () {
      w.el.remove();
      delete state.windows[id];
      updateTaskbarIndicators();
    }, 150);
  }

  function minimizeWindow(id) {
    const w = state.windows[id];
    if (!w) return;
    w.el.classList.add('minimized');
    w.state = 'minimized';
    updateTaskbarIndicators();
  }

  function toggleMaximize(id) {
    const w = state.windows[id];
    if (!w) return;
    w.el.classList.toggle('maximized');
    w.state = w.el.classList.contains('maximized') ? 'maximized' : 'normal';
  }

  function updateTaskbarIndicators() {
    // Windows taskbar active indicators
    $$('.taskbar-app').forEach(function (btn) {
      const appId = btn.dataset.app;
      let isOpen = false;
      for (const wid in state.windows) {
        if (state.windows[wid].appId === appId && !state.windows[wid].el.classList.contains('minimized')) {
          isOpen = true; break;
        }
      }
      btn.classList.toggle('active', isOpen);
    });
    // Mac dock running indicators
    $$('.dock-item').forEach(function (item) {
      const appId = item.dataset.app;
      if (appId === 'launcher' || appId === 'trash' || appId === 'finder') return;
      let isOpen = false;
      for (const wid in state.windows) {
        if (state.windows[wid].appId === appId) { isOpen = true; break; }
      }
      item.classList.toggle('running', isOpen);
    });
  }

  /* ===== Apps ===== */
  const APPS = {
    notepad: {
      title: '无标题 - 记事本',
      icon: 'icon-notepad',
      width: 520,
      height: 420,
      render: function (container) {
        container.innerHTML =
          '<div class="app-notepad">' +
            '<div class="notepad-toolbar">' +
              '<button data-act="new">新建</button>' +
              '<button data-act="save">保存</button>' +
              '<button data-act="clear">清空</button>' +
              '<span style="margin-left:auto;font-size:11px;color:var(--text-secondary)">UTF-8</span>' +
            '</div>' +
            '<textarea class="notepad-textarea" placeholder="在此输入文本…" spellcheck="false">欢迎使用网页版记事本！\n\n这是一个运行在浏览器中的模拟操作系统。\n你可以自由输入、编辑文本。\n\n试试右键桌面、打开开始菜单、切换 Windows / macOS 主题吧。</textarea>' +
          '</div>';
        const ta = $('.notepad-textarea', container);
        container.querySelector('[data-act="new"]').addEventListener('click', function () { ta.value = ''; });
        container.querySelector('[data-act="save"]').addEventListener('click', function () {
          const blob = new Blob([ta.value], { type: 'text/plain' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'note.txt';
          a.click();
          URL.revokeObjectURL(a.href);
          showToast('文件已保存');
        });
        container.querySelector('[data-act="clear"]').addEventListener('click', function () { ta.value = ''; });
      }
    },

    calculator: {
      title: '计算器',
      icon: 'icon-calc',
      width: 300,
      height: 440,
      render: function (container) {
        container.innerHTML =
          '<div class="app-calculator">' +
            '<div class="calc-display">' +
              '<div class="calc-expression"></div>' +
              '<div class="calc-result">0</div>' +
            '</div>' +
            '<div class="calc-buttons">' +
              '<button class="calc-btn func" data-v="C">C</button>' +
              '<button class="calc-btn func" data-v="±">±</button>' +
              '<button class="calc-btn func" data-v="%">%</button>' +
              '<button class="calc-btn op" data-v="÷">÷</button>' +
              '<button class="calc-btn" data-v="7">7</button>' +
              '<button class="calc-btn" data-v="8">8</button>' +
              '<button class="calc-btn" data-v="9">9</button>' +
              '<button class="calc-btn op" data-v="×">×</button>' +
              '<button class="calc-btn" data-v="4">4</button>' +
              '<button class="calc-btn" data-v="5">5</button>' +
              '<button class="calc-btn" data-v="6">6</button>' +
              '<button class="calc-btn op" data-v="−">−</button>' +
              '<button class="calc-btn" data-v="1">1</button>' +
              '<button class="calc-btn" data-v="2">2</button>' +
              '<button class="calc-btn" data-v="3">3</button>' +
              '<button class="calc-btn op" data-v="+">+</button>' +
              '<button class="calc-btn zero" data-v="0">0</button>' +
              '<button class="calc-btn" data-v=".">.</button>' +
              '<button class="calc-btn equal" data-v="=">=</button>' +
            '</div>' +
          '</div>';
        let current = '0', previous = '', operator = '', justEvaluated = false;
        const resultEl = $('.calc-result', container);
        const exprEl = $('.calc-expression', container);
        function updateDisplay() { resultEl.textContent = current; }
        function calc(a, b, op) {
          a = parseFloat(a); b = parseFloat(b);
          if (op === '+') return a + b;
          if (op === '−') return a - b;
          if (op === '×') return a * b;
          if (op === '÷') return b === 0 ? '错误' : a / b;
          return b;
        }
        $$('.calc-btn', container).forEach(function (btn) {
          btn.addEventListener('click', function () {
            const v = btn.dataset.v;
            if (v >= '0' && v <= '9') {
              if (current === '0' || justEvaluated) { current = v; justEvaluated = false; }
              else current += v;
            } else if (v === '.') {
              if (!current.includes('.')) current += '.';
            } else if (v === 'C') {
              current = '0'; previous = ''; operator = ''; exprEl.textContent = '';
            } else if (v === '±') {
              current = String(-parseFloat(current));
            } else if (v === '%') {
              current = String(parseFloat(current) / 100);
            } else if (v === '=') {
              if (operator && previous) {
                current = String(calc(previous, current, operator));
                exprEl.textContent = '';
                previous = ''; operator = ''; justEvaluated = true;
              }
            } else {
              if (operator && previous && !justEvaluated) {
                current = String(calc(previous, current, operator));
              }
              previous = current; operator = v;
              exprEl.textContent = previous + ' ' + v;
              justEvaluated = true;
            }
            updateDisplay();
          });
        });
      }
    },

    browser: {
      title: '浏览器',
      icon: 'icon-browser',
      width: 720,
      height: 520,
      render: function (container) {
        container.innerHTML =
          '<div class="app-browser">' +
            '<div class="browser-toolbar">' +
              '<button class="browser-nav-btn">&larr;</button>' +
              '<button class="browser-nav-btn">&rarr;</button>' +
              '<button class="browser-nav-btn">&#x21bb;</button>' +
              '<div class="browser-address">' +
                '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="#999" stroke-width="1.5"><rect x="3" y="6" width="10" height="8" rx="1.5"/><path d="M5 6V4a3 3 0 016 0v2"/></svg>' +
                '<input type="text" value="https://www.example.com" spellcheck="false">' +
              '</div>' +
              '<button class="browser-nav-btn">&#9733;</button>' +
            '</div>' +
            '<div class="browser-content">' +
              '<div class="browser-home">' +
                '<h1>WebSearch</h1>' +
                '<div class="browser-search-box">' +
                  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#999" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>' +
                  '<input type="text" placeholder="搜索或输入网址">' +
                '</div>' +
                '<div class="browser-links">' +
                  '<a href="#">关于此系统</a>' +
                  '<a href="#">使用技巧</a>' +
                  '<a href="#">快捷键</a>' +
                '</div>' +
                '<p style="margin-top:40px;font-size:13px;color:#999">这是一个模拟浏览器页面，运行在网页操作系统中。</p>' +
              '</div>' +
            '</div>' +
          '</div>';
      }
    },

    files: {
      title: '文件资源管理器',
      icon: 'icon-folder',
      width: 680,
      height: 460,
      render: function (container) {
        const folders = [
          { name: '桌面', icon: 'icon-folder' },
          { name: '文档', icon: 'icon-folder' },
          { name: '下载', icon: 'icon-folder' },
          { name: '图片', icon: 'icon-folder' },
          { name: '音乐', icon: 'icon-folder' },
          { name: '视频', icon: 'icon-folder' },
          { name: '项目', icon: 'icon-folder' },
          { name: '欢迎.txt', icon: 'icon-notepad' },
          { name: '报告.docx', icon: 'icon-notepad' },
          { name: '预算.xlsx', icon: 'icon-notepad' },
          { name: '截图.png', icon: 'icon-paint' },
          { name: '演示.pptx', icon: 'icon-notepad' },
        ];
        let html = '<div class="app-files">' +
          '<div class="files-sidebar">' +
            '<div class="files-sidebar-title">快速访问</div>' +
            '<div class="files-sidebar-item active"><div class="fs-icon icon-folder" style="width:16px;height:16px"></div>桌面</div>' +
            '<div class="files-sidebar-item"><div class="fs-icon icon-folder" style="width:16px;height:16px"></div>文档</div>' +
            '<div class="files-sidebar-item"><div class="fs-icon icon-folder" style="width:16px;height:16px"></div>下载</div>' +
            '<div class="files-sidebar-item"><div class="fs-icon icon-folder" style="width:16px;height:16px"></div>图片</div>' +
            '<div class="files-sidebar-title">此电脑</div>' +
            '<div class="files-sidebar-item"><div class="fs-icon icon-folder" style="width:16px;height:16px"></div>本地磁盘 (C:)</div>' +
            '<div class="files-sidebar-item"><div class="fs-icon icon-folder" style="width:16px;height:16px"></div>数据 (D:)</div>' +
          '</div>' +
          '<div class="files-main"><div class="files-grid">';
        folders.forEach(function (f) {
          html += '<div class="file-item"><div class="fi-icon ' + f.icon + '"></div><span>' + f.name + '</span></div>';
        });
        html += '</div></div></div>';
        container.innerHTML = html;
        $$('.files-sidebar-item', container).forEach(function (item) {
          item.addEventListener('click', function () {
            $$('.files-sidebar-item', container).forEach(function (i) { i.classList.remove('active'); });
            item.classList.add('active');
          });
        });
        $$('.file-item', container).forEach(function (item) {
          item.addEventListener('dblclick', function () {
            showToast('打开：' + item.querySelector('span').textContent);
          });
        });
      }
    },

    terminal: {
      title: '终端',
      icon: 'icon-terminal',
      width: 600,
      height: 400,
      render: function (container) {
        container.innerHTML =
          '<div class="app-terminal" id="term-body">' +
            '<div class="terminal-line">Web Desktop OS Terminal v1.0</div>' +
            '<div class="terminal-line">输入 "help" 查看可用命令</div>' +
            '<div class="terminal-line">&nbsp;</div>' +
          '</div>';
        const body = $('.app-terminal', container);
        const commands = {
          help: function () {
            return '可用命令:\n' +
              '  help      显示此帮助\n' +
              '  ls        列出文件\n' +
              '  echo      回显文本\n' +
              '  date      显示当前日期时间\n' +
              '  whoami    显示当前用户\n' +
              '  uname     系统信息\n' +
              '  theme     切换主题 (win/mac)\n' +
              '  apps      列出可用应用\n' +
              '  open      打开应用 (open <app>)\n' +
              '  clear     清屏';
          },
          ls: function () { return '桌面  文档  下载  图片  音乐  视频  项目  欢迎.txt'; },
          date: function () { return new Date().toString(); },
          whoami: function () { return 'user@web-desktop'; },
          uname: function () { return 'WebDesktop OS 1.0 (browser-based)'; },
          clear: function () { body.innerHTML = ''; return ''; },
          apps: function () { return 'notepad  calculator  browser  files  terminal  settings  about  paint'; },
        };
        function addLine(text, cls) {
          const line = el('div', 'terminal-line' + (cls ? ' ' + cls : ''));
          line.textContent = text;
          body.appendChild(line);
          body.scrollTop = body.scrollHeight;
        }
        function addInputLine() {
          const line = el('div', 'terminal-input-line');
          line.innerHTML = '<span class="terminal-prompt">user@web-desktop:~$</span>';
          const input = el('input', 'terminal-input');
          input.type = 'text';
          input.spellcheck = false;
          line.appendChild(input);
          body.appendChild(line);
          input.focus();
          body.scrollTop = body.scrollHeight;
          input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
              const cmd = input.value.trim();
              input.disabled = true;
              if (cmd) {
                const parts = cmd.split(/\s+/);
                const name = parts[0].toLowerCase();
                const args = parts.slice(1).join(' ');
                if (name === 'echo') {
                  addLine(args);
                } else if (name === 'theme') {
                  if (args === 'win' || args === 'windows') { switchTheme('windows'); addLine('已切换到 Windows 主题'); }
                  else if (args === 'mac' || args === 'macos') { switchTheme('macos'); addLine('已切换到 macOS 主题'); }
                  else addLine('用法: theme <win|mac>');
                } else if (name === 'open') {
                  if (APPS[args]) { createWindow(args); addLine('正在打开 ' + args + ' …'); }
                  else addLine('未知应用: ' + args);
                } else if (commands[name]) {
                  const out = commands[name]();
                  if (out) addLine(out);
                } else {
                  addLine('命令未找到: ' + name + ' (输入 help 查看帮助)');
                }
              }
              addInputLine();
            }
          });
        }
        addInputLine();
        container.addEventListener('click', function () {
          const lastInput = body.querySelector('.terminal-input-line:last-child input');
          if (lastInput) lastInput.focus();
        });
      }
    },

    settings: {
      title: '设置',
      icon: 'icon-settings',
      width: 680,
      height: 500,
      render: function (container) {
        let wpHtml = '';
        wallpapers.forEach(function (wp, i) {
          wpHtml += '<div class="wallpaper-thumb' + (i === state.wallpaperIndex ? ' active' : '') + '" style="background:' + wp + '" data-idx="' + i + '"></div>';
        });
        container.innerHTML =
          '<div class="app-settings">' +
            '<div class="settings-sidebar">' +
              '<div class="settings-nav-item active"><span>&#x1F3A8;</span> 个性化</div>' +
              '<div class="settings-nav-item"><span>&#x1F4BB;</span> 系统</div>' +
              '<div class="settings-nav-item"><span>&#x1F514;</span> 通知</div>' +
              '<div class="settings-nav-item"><span>&#x1F512;</span> 隐私</div>' +
              '<div class="settings-nav-item"><span>&#x2139;</span> 关于</div>' +
            '</div>' +
            '<div class="settings-main">' +
              '<div class="settings-section">' +
                '<h3>主题</h3>' +
                '<div class="theme-switcher">' +
                  '<div class="theme-option' + (state.theme === 'windows' ? ' active' : '') + '" data-theme="windows">' +
                    '<div class="theme-preview win-preview"></div><span>Windows 11</span>' +
                  '</div>' +
                  '<div class="theme-option' + (state.theme === 'macos' ? ' active' : '') + '" data-theme="macos">' +
                    '<div class="theme-preview mac-preview"></div><span>macOS</span>' +
                  '</div>' +
                '</div>' +
              '</div>' +
              '<div class="settings-section">' +
                '<h3>壁纸</h3>' +
                '<div class="wallpaper-grid">' + wpHtml + '</div>' +
              '</div>' +
              '<div class="settings-section">' +
                '<h3>系统</h3>' +
                '<div class="settings-row">' +
                  '<div><label>版本</label><div class="settings-desc">Web Desktop OS 1.0.0</div></div>' +
                '</div>' +
                '<div class="settings-row">' +
                  '<div><label>分辨率</label><div class="settings-desc" id="settings-res"></div></div>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>';
        $('#settings-res', container).textContent = window.innerWidth + ' x ' + window.innerHeight;
        $$('.theme-option', container).forEach(function (opt) {
          opt.addEventListener('click', function () {
            switchTheme(opt.dataset.theme);
            $$('.theme-option', container).forEach(function (o) { o.classList.remove('active'); });
            opt.classList.add('active');
          });
        });
        $$('.wallpaper-thumb', container).forEach(function (thumb) {
          thumb.addEventListener('click', function () {
            setWallpaper(parseInt(thumb.dataset.idx));
            $$('.wallpaper-thumb', container).forEach(function (t) { t.classList.remove('active'); });
            thumb.classList.add('active');
          });
        });
      }
    },

    about: {
      title: '关于本机',
      icon: 'icon-about',
      width: 420,
      height: 480,
      render: function (container) {
        const themeName = state.theme === 'windows' ? 'Windows 11 风格' : 'macOS 风格';
        container.innerHTML =
          '<div class="app-about">' +
            '<div class="about-logo icon-about"></div>' +
            '<h2>Web Desktop OS</h2>' +
            '<div class="about-version">版本 1.0.0 &nbsp;|&nbsp; ' + themeName + '</div>' +
            '<div class="about-specs">' +
              '<div class="about-spec-row"><span class="spec-label">处理器</span><span class="spec-value">Browser Virtual CPU</span></div>' +
              '<div class="about-spec-row"><span class="spec-label">内存</span><span class="spec-value">8 GB 虚拟</span></div>' +
              '<div class="about-spec-row"><span class="spec-label">图形卡</span><span class="spec-value">WebGL Accelerated</span></div>' +
              '<div class="about-spec-row"><span class="spec-label">显示器</span><span class="spec-value" id="about-res"></span></div>' +
              '<div class="about-spec-row"><span class="spec-label">系统类型</span><span class="spec-value">64 位浏览器操作系统</span></div>' +
              '<div class="about-spec-row"><span class="spec-label">技术栈</span><span class="spec-value">HTML + CSS + JS</span></div>' +
            '</div>' +
            '<p style="margin-top:24px;font-size:11px;color:var(--text-secondary)">纯前端实现，无需安装，打开即用</p>' +
          '</div>';
        $('#about-res', container).textContent = window.innerWidth + ' x ' + window.innerHeight;
      }
    },

    paint: {
      title: '画图',
      icon: 'icon-paint',
      width: 640,
      height: 500,
      render: function (container) {
        const colors = ['#000000', '#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#007AFF', '#5856D6', '#AF52DE', '#FF2D55', '#FFFFFF'];
        let colorBtns = '';
        colors.forEach(function (c, i) {
          colorBtns += '<div class="paint-color' + (i === 0 ? ' active' : '') + '" style="background:' + c + '" data-color="' + c + '"></div>';
        });
        container.innerHTML =
          '<div class="app-paint">' +
            '<div class="paint-toolbar">' +
              colorBtns +
              '<div style="width:1px;height:20px;background:rgba(0,0,0,0.15);margin:0 8px"></div>' +
              '<span style="font-size:12px;color:var(--text-secondary)">粗细</span>' +
              '<input type="range" class="paint-size" min="1" max="30" value="4">' +
              '<button class="paint-clear" style="margin-left:auto;padding:4px 12px;font-size:12px;border-radius:6px;background:var(--hover-bg)">清空</button>' +
            '</div>' +
            '<div class="paint-canvas-wrap"><canvas class="paint-canvas"></canvas></div>' +
          '</div>';
        const canvas = $('.paint-canvas', container);
        const wrap = $('.paint-canvas-wrap', container);
        const ctx = canvas.getContext('2d');
        let drawing = false, currentColor = '#000000', currentSize = 4;

        function resizeCanvas() {
          const rect = wrap.getBoundingClientRect();
          const tmp = document.createElement('canvas');
          tmp.width = canvas.width; tmp.height = canvas.height;
          tmp.getContext('2d').drawImage(canvas, 0, 0);
          canvas.width = rect.width;
          canvas.height = rect.height;
          ctx.drawImage(tmp, 0, 0);
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(tmp, 0, 0);
        }
        setTimeout(resizeCanvas, 50);

        $$('.paint-color', container).forEach(function (el) {
          el.addEventListener('click', function () {
            $$('.paint-color', container).forEach(function (c) { c.classList.remove('active'); });
            el.classList.add('active');
            currentColor = el.dataset.color;
          });
        });
        $('.paint-size', container).addEventListener('input', function (e) { currentSize = parseInt(e.target.value); });
        $('.paint-clear', container).addEventListener('click', function () {
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        });

        function getPos(e) {
          const rect = canvas.getBoundingClientRect();
          return { x: e.clientX - rect.left, y: e.clientY - rect.top };
        }
        canvas.addEventListener('mousedown', function (e) {
          drawing = true;
          const p = getPos(e);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.strokeStyle = currentColor;
          ctx.lineWidth = currentSize;
        });
        canvas.addEventListener('mousemove', function (e) {
          if (!drawing) return;
          const p = getPos(e);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        });
        canvas.addEventListener('mouseup', function () { drawing = false; });
        canvas.addEventListener('mouseleave', function () { drawing = false; });
      }
    },
  };

  /* ===== Theme Switching ===== */
  function switchTheme(theme) {
    if (state.theme === theme) return;
    state.theme = theme;
    const desktop = $('#desktop');
    desktop.classList.remove('theme-windows', 'theme-macos');
    desktop.classList.add('theme-' + theme);
    // Update theme switch button label
    const label = $('#theme-label');
    if (label) label.textContent = theme === 'windows' ? 'Windows' : 'macOS';
    // Rebuild title bars for all open windows
    for (const wid in state.windows) {
      const w = state.windows[wid];
      const app = APPS[w.appId];
      const body = w.el.querySelector('.window-body');
      const bodyHtml = body.innerHTML;
      w.el.removeChild(w.el.querySelector('.window-titlebar'));
      const newTitlebar = buildTitlebar(app, wid);
      w.el.insertBefore(newTitlebar, w.el.firstChild);
    }
    showToast(theme === 'windows' ? '已切换到 Windows 11 主题' : '已切换到 macOS 主题');
  }

  function buildTitlebar(app, wid) {
    const titlebar = el('div', 'window-titlebar');
    const isMac = state.theme === 'macos';
    if (isMac) {
      const controls = el('div', 'window-controls');
      const closeBtn = el('button', 'mac-ctrl-btn close', '<svg viewBox="0 0 10 10"><path d="M2 2l6 6M8 2l-6 6" stroke="rgba(0,0,0,0.5)" stroke-width="1.5"/></svg>');
      const minBtn = el('button', 'mac-ctrl-btn minimize', '<svg viewBox="0 0 10 10"><path d="M2 5h6" stroke="rgba(0,0,0,0.5)" stroke-width="1.5"/></svg>');
      const maxBtn = el('button', 'mac-ctrl-btn maximize', '<svg viewBox="0 0 10 10"><path d="M3 3h4v4H3z" fill="none" stroke="rgba(0,0,0,0.5)" stroke-width="1"/></svg>');
      closeBtn.addEventListener('click', function (e) { e.stopPropagation(); closeWindow(wid); });
      minBtn.addEventListener('click', function (e) { e.stopPropagation(); minimizeWindow(wid); });
      maxBtn.addEventListener('click', function (e) { e.stopPropagation(); toggleMaximize(wid); });
      controls.appendChild(closeBtn); controls.appendChild(minBtn); controls.appendChild(maxBtn);
      titlebar.appendChild(controls);
      titlebar.appendChild(el('div', 'window-title', app.title));
    } else {
      const titleDiv = el('div', 'window-title');
      titleDiv.innerHTML = '<div class="win-title-icon ' + app.icon + '"></div>' + app.title;
      titlebar.appendChild(titleDiv);
      const controls = el('div', 'window-controls');
      const minBtn = el('button', 'win-ctrl-btn minimize', '<svg viewBox="0 0 12 12"><path d="M2 6h8" stroke="currentColor" stroke-width="1.2"/></svg>');
      const maxBtn = el('button', 'win-ctrl-btn maximize', '<svg viewBox="0 0 12 12"><rect x="2" y="2" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>');
      const closeBtn = el('button', 'win-ctrl-btn close', '<svg viewBox="0 0 12 12"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.2"/></svg>');
      minBtn.addEventListener('click', function (e) { e.stopPropagation(); minimizeWindow(wid); });
      maxBtn.addEventListener('click', function (e) { e.stopPropagation(); toggleMaximize(wid); });
      closeBtn.addEventListener('click', function (e) { e.stopPropagation(); closeWindow(wid); });
      controls.appendChild(minBtn); controls.appendChild(maxBtn); controls.appendChild(closeBtn);
      titlebar.appendChild(controls);
    }
    // Drag
    titlebar.addEventListener('mousedown', function (e) {
      if (e.target.closest('button')) return;
      const winEl = state.windows[wid].el;
      if (winEl.classList.contains('maximized')) return;
      focusWindow(wid);
      const startX = e.clientX, startY = e.clientY;
      const origLeft = winEl.offsetLeft, origTop = winEl.offsetTop;
      function onMove(ev) {
        winEl.style.left = (origLeft + ev.clientX - startX) + 'px';
        winEl.style.top = clamp(origTop + ev.clientY - startY, 0, window.innerHeight - 60) + 'px';
      }
      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
    return titlebar;
  }

  /* ===== Wallpaper ===== */
  function setWallpaper(idx) {
    state.wallpaperIndex = idx;
    $('#desktop').style.background = wallpapers[idx];
    $('#desktop').style.backgroundSize = 'cover';
  }

  /* ===== Start Menu / Launchpad ===== */
  function toggleStartMenu() {
    const menu = $('#win-start-menu');
    menu.classList.toggle('show');
  }
  function toggleLaunchpad() {
    const lp = $('#mac-launchpad');
    lp.classList.toggle('show');
  }

  /* ===== Context Menu ===== */
  function showContextMenu(x, y) {
    const menu = $('#context-menu');
    menu.style.left = Math.min(x, window.innerWidth - 220) + 'px';
    menu.style.top = Math.min(y, window.innerHeight - 220) + 'px';
    menu.classList.add('show');
  }
  function hideContextMenu() {
    $('#context-menu').classList.remove('show');
  }

  /* ===== Download Source ===== */
  function downloadFile(filename, content, type) {
    const blob = new Blob([content], { type: type || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function fetchText(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    });
  }

  function downloadSource() {
    const files = [
      { name: 'index.html', type: 'text/html;charset=utf-8' },
      { name: 'style.css', type: 'text/css;charset=utf-8' },
      { name: 'script.js', type: 'application/javascript;charset=utf-8' },
    ];
    let okCount = 0;
    let failMsg = '';
    files.forEach(function (f, i) {
      setTimeout(function () {
        fetchText(f.name).then(function (text) {
          downloadFile(f.name, text, f.type);
          okCount++;
          if (okCount + (failMsg ? 1 : 0) === files.length) {
            if (okCount === files.length) {
              showToast('已下载 index.html、style.css、script.js');
            } else {
              showToast('已下载 ' + okCount + ' 个文件' + (failMsg ? '，' + failMsg : ''));
            }
          }
        }).catch(function () {
          failMsg = f.name + ' 获取失败';
          if (okCount + 1 === files.length) {
            showToast('部分文件下载失败：请通过本地服务器（如 VS Code Live Server）打开页面后重试，或直接使用交付的源文件');
          }
        });
      }, i * 250);
    });
  }

  /* ===== Init ===== */
  function init() {
    // Boot screen
    setTimeout(function () {
      $('#boot-screen').classList.add('hide');
      setTimeout(function () { $('#boot-screen').style.display = 'none'; }, 600);
    }, 1400);

    updateClock();
    setInterval(updateClock, 1000);

    // Desktop icons: double-click to open
    $$('.desktop-icon').forEach(function (icon) {
      icon.addEventListener('click', function (e) {
        $$('.desktop-icon').forEach(function (i) { i.classList.remove('selected'); });
        icon.classList.add('selected');
        e.stopPropagation();
      });
      icon.addEventListener('dblclick', function () {
        createWindow(icon.dataset.app);
      });
    });

    // Desktop click deselects
    $('#desktop').addEventListener('click', function (e) {
      if (e.target.id === 'desktop' || e.target.id === 'desktop-icons' || e.target.id === 'windows-container') {
        $$('.desktop-icon').forEach(function (i) { i.classList.remove('selected'); });
      }
      hideContextMenu();
      const startMenu = $('#win-start-menu');
      if (startMenu.classList.contains('show') && !e.target.closest('#win-start-menu') && !e.target.closest('#win-start-btn')) {
        startMenu.classList.remove('show');
      }
      const lp = $('#mac-launchpad');
      if (lp.classList.contains('show')) lp.classList.remove('show');
    });

    // Right-click context menu
    $('#desktop').addEventListener('contextmenu', function (e) {
      e.preventDefault();
      showContextMenu(e.clientX, e.clientY);
    });

    // Context menu actions
    $$('.ctx-item').forEach(function (item) {
      item.addEventListener('click', function () {
        const action = item.dataset.action;
        hideContextMenu();
        if (action === 'refresh') { showToast('桌面已刷新'); }
        else if (action === 'switch-theme') { switchTheme(state.theme === 'windows' ? 'macos' : 'windows'); }
        else if (action === 'display-settings') { createWindow('settings'); }
        else if (action === 'new-folder') { showToast('新建文件夹'); }
        else { showToast(item.textContent); }
      });
    });

    // Windows start button
    $('#win-start-btn').addEventListener('click', function (e) {
      e.stopPropagation();
      toggleStartMenu();
    });

    // Start menu apps
    $$('.start-app').forEach(function (app) {
      app.addEventListener('click', function () {
        createWindow(app.dataset.app);
        $('#win-start-menu').classList.remove('show');
      });
    });

    // Windows taskbar app buttons
    $$('.taskbar-app').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const appId = btn.dataset.app;
        let found = null;
        for (const wid in state.windows) {
          if (state.windows[wid].appId === appId) { found = wid; break; }
        }
        if (found) {
          const w = state.windows[found];
          if (w.el.classList.contains('minimized')) {
            w.el.classList.remove('minimized');
            focusWindow(found);
          } else if (state.activeWindow === found) {
            minimizeWindow(found);
          } else {
            focusWindow(found);
          }
        } else {
          createWindow(appId);
        }
      });
    });

    // Mac dock items
    $$('.dock-item').forEach(function (item) {
      item.addEventListener('click', function () {
        const appId = item.dataset.app;
        if (appId === 'launcher') { toggleLaunchpad(); return; }
        if (appId === 'finder') { createWindow('files'); return; }
        if (appId === 'trash') { showToast('废纸篓是空的'); return; }
        createWindow(appId);
      });
    });

    // Launchpad apps
    $$('.lp-app').forEach(function (app) {
      app.addEventListener('click', function () {
        createWindow(app.dataset.app);
        $('#mac-launchpad').classList.remove('show');
      });
    });

    // Theme switch button
    $('#theme-switch-btn').addEventListener('click', function () {
      switchTheme(state.theme === 'windows' ? 'macos' : 'windows');
    });

    // Download source button
    $('#download-source-btn').addEventListener('click', function () {
      downloadSource();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        $('#win-start-menu').classList.remove('show');
        $('#mac-launchpad').classList.remove('show');
        hideContextMenu();
      }
    });

    // Open a welcome window after boot
    setTimeout(function () { createWindow('about'); }, 1800);
  }

  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
