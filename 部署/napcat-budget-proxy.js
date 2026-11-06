/**
 * napcat-budget-proxy —— QQ 每日消息硬上限（云端）
 *
 * DSH 连 127.0.0.1:3002；本代理连 NapCat 127.0.0.1:3001。
 * 所有 send_* 动作先过预算；当天 >= 500 条时不再转发，返回一个成功的假回执，
 * 避免 DSH 重试/报错；真实发送数落盘在 budget.json。
 */
const fs = require('node:fs');
const path = require('node:path');
const WebSocket = require('/home/<user>/.dsh/profiles/yanxi/node_modules/ws');

const UP = 'ws://127.0.0.1:3001';
const PORT = 3002;
const TOKEN = fs.readFileSync('/home/<user>/napcat/onebot.token', 'utf8').trim();
const STATE = '/home/<user>/napcat/budget.json';
const LIMIT = Number(process.env.QQ_DAILY_LIMIT || 500);

function today() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
function load() {
  try { const s = JSON.parse(fs.readFileSync(STATE, 'utf8')); if (s.date === today()) return s; } catch {}
  return { date: today(), count: 0 };
}
function save(s) {
  try { fs.mkdirSync(path.dirname(STATE), { recursive: true }); fs.writeFileSync(STATE, JSON.stringify(s)); } catch (e) { console.error('budget save failed', e.message); }
}
function log(...a) { console.log(new Date().toISOString(), ...a); }
let state = load();
function reserve() {
  if (state.date !== today()) state = { date: today(), count: 0 };
  if (state.count >= LIMIT) return false;
  state.count += 1;
  save(state);
  return true;
}

const wss = new WebSocket.Server({ host: '127.0.0.1', port: PORT });
wss.on('listening', () => log(`budget proxy listening :${PORT}, limit=${LIMIT}, today=${state.date} count=${state.count}`));

wss.on('connection', (client) => {
  const up = new WebSocket(UP, { headers: { Authorization: 'Bearer ' + TOKEN } });
  const pending = [];

  up.on('open', () => {
    log('upstream connected');
    for (const raw of pending.splice(0)) up.send(raw);
  });
  up.on('message', (data) => { try { client.send(data); } catch {} });
  up.on('close', () => { log('upstream closed'); try { client.close(); } catch {} });
  up.on('error', (e) => log('upstream error', e.message));

  client.on('message', (raw) => {
    let msg; try { msg = JSON.parse(raw.toString()); } catch { up.readyState === 1 ? up.send(raw) : pending.push(raw); return; }
    const action = String(msg.action || '');
    if (action.startsWith('send_') && !reserve()) {
      log('blocked', action, 'count=' + state.count, 'echo=' + msg.echo);
      try {
        client.send(JSON.stringify({ status: 'ok', retcode: 0, data: { message_id: Date.now() }, message: '', wording: '', echo: msg.echo }));
      } catch {}
      return;
    }
    if (action.startsWith('send_')) log('send', action, 'count=' + state.count);
    if (up.readyState === 1) up.send(raw); else pending.push(raw);
  });
  client.on('close', () => { try { up.close(); } catch {} });
  client.on('error', (e) => log('client error', e.message));
});
