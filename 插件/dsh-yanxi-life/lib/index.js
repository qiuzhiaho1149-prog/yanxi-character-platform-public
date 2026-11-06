/**
 * dsh-yanxi-life —— 嫣汐的生活沙箱
 *
 * 给她的「手脚」：只能在自己的生活目录里读、写、列目录、建目录。
 * 不暴露宿主 shell、系统目录、绝对路径、任意网络。
 *
 * 根目录默认 ~/.dsh-yanxi/life，可用 DSH_LIFE_ROOT 覆盖（云上通常不覆盖）。
 */

export const name = 'dsh-yanxi-life'
export const inject = ['tools']

import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const VERSION = '0.1.0'
const DEFAULT_ROOT = path.join(os.homedir(), '.dsh-yanxi', 'life')
const MAX_READ = 256 * 1024
const MAX_WRITE = 512 * 1024
const MAX_LIST = 200

function rootDir() {
  const configured = String(process.env.DSH_LIFE_ROOT ?? '').trim()
  return path.resolve(configured || DEFAULT_ROOT)
}

function cleanRel(input) {
  const rel = typeof input === 'string' ? input.trim() : ''
  if (!rel) return ''
  if (rel.includes('\0')) throw new Error('路径不合法')
  if (path.isAbsolute(rel)) throw new Error('只接受生活目录里的相对路径')
  return rel.replace(/^[/\\]+/, '')
}

/** 解析到生活目录内；越界直接拒绝。 */
export function resolveInside(root, input) {
  const base = path.resolve(root)
  const rel = cleanRel(input)
  const target = path.resolve(base, rel)
  if (target !== base && !target.startsWith(base + path.sep)) throw new Error('越界：只能碰生活目录里的东西')
  return target
}

async function ensureRoot() {
  const root = rootDir()
  await fs.mkdir(root, { recursive: true })
  return root
}

function relOf(root, abs) {
  const rel = path.relative(root, abs)
  return rel === '' ? '.' : rel.split(path.sep).join('/')
}

function text(v) {
  return typeof v === 'string' ? v.trim() : ''
}

function clip(s, n) {
  const t = String(s ?? '')
  return t.length > n ? `${t.slice(0, n - 1)}…` : t
}

function looksBinary(buf) {
  const n = Math.min(buf.length, 8000)
  for (let i = 0; i < n; i++) if (buf[i] === 0) return true
  return false
}

const OUTPUT = {
  schema: {
    type: 'object',
    properties: {
      ok: { type: 'boolean' },
      text: { type: 'string' },
    },
    required: ['ok', 'text'],
  },
  render: (_args, out) => [{ type: 'text', text: text(out?.text) || '（没结果）' }],
}

export function apply(ctx) {
  ctx.tools.register({
    name: 'life_list',
    description: '看看自己的生活目录里有什么：文件、文件夹、大小。path 是相对生活目录的路径，空就是根。',
    parameters: {
      type: 'object',
      properties: { path: { type: 'string', description: '相对生活目录的路径，空就是根' } },
      additionalProperties: false,
    },
    output: OUTPUT,
    async execute(args = {}) {
      try {
        const root = await ensureRoot()
        const dir = resolveInside(root, args.path)
        const entries = await fs.readdir(dir, { withFileTypes: true })
        if (!entries.length) return { ok: true, text: '这里空空的。' }
        const rows = []
        for (const entry of entries.slice(0, MAX_LIST)) {
          const full = path.join(dir, entry.name)
          let size = ''
          try {
            const st = await fs.stat(full)
            size = entry.isDirectory() ? '' : ` (${st.size}B)`
          } catch {}
          rows.push(`${entry.isDirectory() ? '📁' : '📄'} ${entry.name}${size}`)
        }
        const more = entries.length > MAX_LIST ? `\n…还有 ${entries.length - MAX_LIST} 个没列` : ''
        return { ok: true, text: `${relOf(root, dir)}\n${rows.join('\n')}${more}` }
      } catch (err) {
        return { ok: false, text: err?.message ?? '列不了' }
      }
    },
  })

  ctx.tools.register({
    name: 'life_read',
    description: '读生活目录里的一个文本文件。path 是相对生活目录的路径；太大或二进制会拒绝。',
    parameters: {
      type: 'object',
      properties: { path: { type: 'string', description: '相对生活目录的文件路径' } },
      required: ['path'],
      additionalProperties: false,
    },
    output: OUTPUT,
    async execute(args = {}) {
      try {
        const root = await ensureRoot()
        const file = resolveInside(root, args.path)
        const st = await fs.stat(file)
        if (!st.isFile()) throw new Error('不是文件')
        if (st.size > MAX_READ) throw new Error(`文件太大（${st.size}B），我一次读不了`)
        const buf = await fs.readFile(file)
        if (looksBinary(buf)) throw new Error('这看着像二进制，我读不了')
        return { ok: true, text: clip(buf.toString('utf8'), MAX_READ) || '（空文件）' }
      } catch (err) {
        return { ok: false, text: err?.message ?? '读不了' }
      }
    },
  })

  ctx.tools.register({
    name: 'life_write',
    description: '写一个文本文件到生活目录（会建父目录，覆盖原文件）。path 是相对路径，content 是内容。',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '相对生活目录的文件路径' },
        content: { type: 'string', description: '要写的内容' },
      },
      required: ['path', 'content'],
      additionalProperties: false,
    },
    output: OUTPUT,
    async execute(args = {}) {
      try {
        const root = await ensureRoot()
        const file = resolveInside(root, args.path)
        const content = String(args.content ?? '')
        if (Buffer.byteLength(content, 'utf8') > MAX_WRITE) throw new Error('内容太大，我写不下')
        await fs.mkdir(path.dirname(file), { recursive: true })
        const tmp = `${file}.tmp-${process.pid}-${Date.now()}`
        await fs.writeFile(tmp, content, 'utf8')
        await fs.rename(tmp, file)
        return { ok: true, text: `写好了：${relOf(root, file)}` }
      } catch (err) {
        return { ok: false, text: err?.message ?? '写不了' }
      }
    },
  })

  ctx.tools.register({
    name: 'life_mkdir',
    description: '在生活目录里建一个文件夹。path 是相对路径。',
    parameters: {
      type: 'object',
      properties: { path: { type: 'string', description: '相对生活目录的文件夹路径' } },
      required: ['path'],
      additionalProperties: false,
    },
    output: OUTPUT,
    async execute(args = {}) {
      try {
        const root = await ensureRoot()
        const dir = resolveInside(root, args.path)
        await fs.mkdir(dir, { recursive: true })
        return { ok: true, text: `建好了：${relOf(root, dir)}` }
      } catch (err) {
        return { ok: false, text: err?.message ?? '建不了' }
      }
    },
  })

  ctx.logger?.info?.(`dsh-yanxi-life ${VERSION} 就绪（生活目录：${rootDir()}）`)
}
