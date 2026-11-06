/**
 * dsh-yanxi-vision —— 用 DeepSeek Flash 自己的视觉能力看图
 *
 * 不依赖宿主 read_image / attachments：直接读本机图片，base64 发给
 * https://api.deepseek.com/chat/completions，model=deepseek-flash。
 * 返回一段中文描述；只允许读嫣汐家/生活目录里的图片。
 */
export const name = 'dsh-yanxi-vision'
export const inject = ['tools']

import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const ROOT = path.join(os.homedir(), '.dsh-yanxi')
const HOME = path.join(ROOT, 'home')
const LIFE = path.join(ROOT, 'life')
const MAX_BYTES = 10 * 1024 * 1024
const API = 'https://api.deepseek.com/chat/completions'

function inside(base, target) {
  const b = path.resolve(base)
  const t = path.resolve(target)
  return t === b || t.startsWith(b + path.sep)
}

function mimeOf(file, buf) {
  const ext = path.extname(file).toLowerCase()
  if (ext === '.gif') return 'image/gif'
  if (ext === '.png') return 'image/png'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (buf[0] === 0x89 && buf[1] === 0x50) return 'image/png'
  if (buf[0] === 0x47 && buf[1] === 0x49) return 'image/gif'
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'image/jpeg'
  if (buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp'
  return ''
}

export async function describeImage(file, question = '') {
  const abs = path.resolve(String(file || ''))
  if (!inside(HOME, abs) && !inside(LIFE, abs)) throw new Error('只能看嫣汐家或生活目录里的图片')
  const st = await fs.stat(abs)
  if (!st.isFile()) throw new Error('不是文件')
  if (st.size > MAX_BYTES) throw new Error('图片太大，我一次看不了')
  const buf = await fs.readFile(abs)
  const mime = mimeOf(abs, buf)
  if (!mime) throw new Error('这不是我能看的图片格式（支持 JPEG/PNG/GIF/WebP）')
  const key = String(process.env.DEEPSEEK_API_KEY || '').trim()
  if (!key) throw new Error('视觉服务没配置 key')
  const ask = String(question || '').trim() ||
    '用中文描述这张图/表情包：画面里有什么、有没有文字（有就念出来）、大概是什么情绪或梗。只描述你看到的，不要编造。'
  const body = {
    model: 'deepseek-flash',
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: ask },
        { type: 'image_url', image_url: { url: `data:${mime};base64,${buf.toString('base64')}` } },
      ],
    }],
    max_tokens: 1200,
    temperature: 0.2,
  }
  const res = await fetch(API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(90000),
  })
  if (!res.ok) throw new Error(`视觉接口返回 HTTP ${res.status}`)
  const data = await res.json()
  const msg = data?.choices?.[0]?.message ?? {}
  const out = String(msg.content || '').trim() || String(msg.reasoning_content || '').trim()
  if (!out) throw new Error('视觉接口没有返回描述')
  return out
}

const OUTPUT = {
  schema: {
    type: 'object',
    properties: { ok: { type: 'boolean' }, text: { type: 'string' } },
    required: ['ok', 'text'],
  },
  render: (_a, out) => [{ type: 'text', text: String(out?.text || '（没看到）') }],
}

export function apply(ctx) {
  ctx.tools.register({
    name: 'see_image',
    description: '看一张本机图片/表情包：描述画面、读出文字、判断情绪。path 用消息里给出的图片路径；question 可选。',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '图片的本地路径（QQ 图片缓存路径）' },
        question: { type: 'string', description: '想问这张图什么；不填就描述画面和文字' },
      },
      required: ['path'],
      additionalProperties: false,
    },
    output: OUTPUT,
    async execute(args = {}) {
      try {
        const text = await describeImage(args.path, args.question)
        return { ok: true, text }
      } catch (err) {
        return { ok: false, text: err?.message ?? '看不了这张图' }
      }
    },
  })
  ctx.logger?.info?.(`dsh-yanxi-vision 就绪（DeepSeek Flash 视觉）`)
}
