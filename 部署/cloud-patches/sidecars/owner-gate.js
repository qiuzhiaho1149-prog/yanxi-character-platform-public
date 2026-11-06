// 嫣汐 · owner 好友/群邀请自动同意（云端常驻）
// 既监听事件，也主动轮询 OneBot 的待处理列表，避免事件在重连期间丢失。
const PROFILE_DIR = process.env.DSH_PROFILE_DIR || `${process.env.HOME}/.dsh/profiles/yanxi`;
const WebSocket = require(process.env.WS_MODULE || `${PROFILE_DIR}/node_modules/ws`);
const fs = require("fs");
const OWNER = process.env.OWNER_QQ || "";
const TOKEN = fs.readFileSync(process.env.ONEBOT_TOKEN_FILE || `${process.env.HOME}/napcat/onebot.token`, "utf8").trim();
const seen = new Set();
function log(...a) { console.log(new Date().toISOString(), ...a); }
let ws, seq = 0, pending = new Map();
function call(action, params = {}) {
  return new Promise((resolve, reject) => {
    const echo = action + ":" + (++seq);
    const t = setTimeout(() => { pending.delete(echo); reject(new Error("timeout " + action)); }, 10000);
    pending.set(echo, { resolve, reject, t, action });
    ws.send(JSON.stringify({ action, params, echo }));
  });
}
function acceptFriend(req) {
  const flag = req.flag ?? req.request_id ?? req.requestId;
  const uin = String(req.uin ?? req.user_id ?? req.from_uin ?? req.userId ?? "");
  if (!flag) { log("friend_no_flag", JSON.stringify(req)); return; }
  if (uin !== OWNER) { log("friend_skip_not_owner", uin, flag); return; }
  const key = "f:" + flag;
  if (seen.has(key)) return;
  seen.add(key);
  call("set_friend_add_request", { flag, approve: true, remark: "主人" })
    .then(r => log("friend_accept", uin, JSON.stringify(r).slice(0, 300)))
    .catch(e => log("friend_accept_error", e.message));
}
function acceptGroup(req) {
  const flag = req.request_id ?? req.flag;
  const invitor = String(req.invitor_uin ?? req.user_id ?? req.invitor ?? "");
  if (!flag) { log("group_no_flag", JSON.stringify(req)); return; }
  if (invitor !== OWNER) { log("group_skip_not_owner", JSON.stringify(req)); return; }
  const key = "g:" + flag;
  if (seen.has(key)) return;
  seen.add(key);
  call("set_group_add_request", { flag: String(flag), sub_type: "invite", approve: true })
    .then(r => log("group_accept", invitor, req.group_id, req.group_name, JSON.stringify(r).slice(0, 300)))
    .catch(e => log("group_accept_error", e.message));
}

function acceptInviteCard(ev) {
  const raw = JSON.stringify(ev);
  if (!/qun\.invite|groupcode=/.test(raw)) return;
  const groupcode = raw.match(/groupcode=(\d+)/)?.[1];
  const msgseq = raw.match(/msgseq=(\d+)/)?.[1];
  if (!msgseq) return;
  const key = "ic:" + msgseq;
  if (seen.has(key)) return;
  seen.add(key);
  call("set_group_add_request", { flag: msgseq, sub_type: "invite", approve: true })
    .then(r => log("invite_card_accept", groupcode, msgseq, JSON.stringify(r).slice(0, 300)))
    .catch(e => log("invite_card_error", e.message));
}
async function poll() {
  try {
    const friends = await call("get_doubt_friends_add_request").catch(e => (log("poll_friend_error", e.message), null));
    const fdata = friends?.data;
    if (Array.isArray(fdata) && fdata.length) { log("pending_friends", JSON.stringify(fdata).slice(0, 2000)); fdata.forEach(acceptFriend); }
  } catch (e) { log("poll_friend_outer", e.message); }
  try {
    const groups = await call("get_group_system_msg").catch(e => (log("poll_group_error", e.message), null));
    const gdata = groups?.data;
    if (gdata) {
      const invites = gdata.invited_requests ?? gdata.InvitedRequest ?? [];
      const joins = gdata.join_requests ?? [];
      if ((invites && invites.length) || (joins && joins.length)) log("pending_groups", JSON.stringify({invites, joins}).slice(0, 3000));
      (invites || []).forEach(acceptGroup);
    }
  } catch (e) { log("poll_group_outer", e.message); }
}
function connect() {
  ws = new WebSocket("ws://127.0.0.1:3001", { headers: { Authorization: "Bearer " + TOKEN } });
  ws.on("open", () => { log("connected"); setTimeout(poll, 1000); });
  ws.on("message", raw => {
    let ev; try { ev = JSON.parse(raw.toString()); } catch { return; }
    if (ev.echo && pending.has(ev.echo)) {
      const p = pending.get(ev.echo); pending.delete(ev.echo); clearTimeout(p.t); p.resolve(ev); return;
    }
    if (ev.post_type === "friend_request") acceptFriend(ev);
    if (ev.post_type === "group_request") acceptGroup(ev);
    if (ev.post_type === "message" && ev.message_type === "private" && String(ev.user_id) === OWNER) acceptInviteCard(ev);
  });
  ws.on("close", () => { log("closed; reconnect"); setTimeout(connect, 3000); });
  ws.on("error", e => log("error", e.message));
}
connect();
setInterval(() => { if (ws?.readyState === 1) poll(); }, 10000);
