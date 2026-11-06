import { promises as fs } from 'node:fs';
import path from 'node:path';

const API = 'https://api.deepseek.com/chat/completions';
const MAX_BYTES = 10 * 1024 * 1024;

function mimeOf(file, buf) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.gif') return 'image/gif';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50) return 'image/png';
  if (buf[0] === 0x47 && buf[1] === 0x49) return 'image/gif';
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'image/jpeg';
  if (buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return '';
}

export async function describeImageFile(file) {
  const key = String(process.env.DEEPSEEK_API_KEY || '').trim();
  if (!key) throw new Error('没有视觉 key');
  const abs = path.resolve(String(file || ''));
  const st = await fs.stat(abs);
  if (!st.isFile()) throw new Error('不是文件');
  if (st.size > MAX_BYTES) throw new Error('图片太大');
  const buf = await fs.readFile(abs);
  const mime = mimeOf(abs, buf);
  if (!mime) throw new Error('不支持的图片格式');
  const ask = '用中文简短描述这张图或表情包：画面里有什么、有没有文字（有就念出来）、大概是什么情绪/梗。只写你看到的，不编造。控制在 200 字内。';
  const res = await fetch(API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'deepseek-flash',
      messages: [{ role: 'user', content: [
        { type: 'text', text: ask },
        { type: 'image_url', image_url: { url: `data:${mime};base64,${buf.toString('base64')}` } },
      ] }],
      max_tokens: 900,
      temperature: 0.2,
    }),
    signal: AbortSignal.timeout(45000),
  });
  if (!res.ok) throw new Error(`视觉接口 HTTP ${res.status}`);
  const data = await res.json();
  const msg = data?.choices?.[0]?.message ?? {};
  const out = String(msg.content || '').trim();
  if (!out) throw new Error('视觉接口没有描述');
  return out;
}
