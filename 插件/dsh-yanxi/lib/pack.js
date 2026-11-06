/**
 * pack.js —— Character Pack 读取层（Phase 1.5）
 *
 * 这一版只做「只读加载」：读取 character.json，校验 manifest，解析出
 * 角色身份/数据根/工具/窗口的引用路径，供后续 runtime 使用。
 *
 * 刻意不做的事：
 *   - 不迁移数据
 *   - 不修改 seed/提示词
 *   - 不改变当前 root/行为
 *
 * 这样先让 runner 知道「这个角色是谁、包在哪」，验证通过后再做数据根迁移。
 */

import { promises as fs } from 'node:fs'
import { dirname, isAbsolute, join, resolve } from 'node:path'

export const PACK_SCHEMA_VERSION = 1

export function defaultPackPath(root) {
  return join(root, 'character-packs', 'yanxi', 'character.json')
}

function str(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : ''
}

/**
 * @param {string} root 当前角色数据根（只用于默认 pack 路径）
 * @param {{ packPath?: string, env?: NodeJS.ProcessEnv }} [opts]
 * @returns {Promise<object>} 永不上抛：缺失返回 skipped，坏包返回 error
 */
export async function loadCharacterPack(root, opts = {}) {
  const env = opts.env ?? process.env
  const requested = str(opts.packPath) || str(env.DSH_YANXI_PACK) || defaultPackPath(root)
  const manifestPath = resolve(requested)

  let raw
  try {
    raw = await fs.readFile(manifestPath, 'utf8')
  } catch (err) {
    if (err?.code === 'ENOENT') {
      return { ok: false, skipped: true, reason: 'pack not found', manifestPath }
    }
    return { ok: false, skipped: false, reason: `read failed: ${err?.message ?? err}`, manifestPath }
  }

  let manifest
  try {
    manifest = JSON.parse(raw)
  } catch (err) {
    return { ok: false, skipped: false, reason: `invalid json: ${err?.message ?? err}`, manifestPath }
  }

  const schemaVersion = Number(manifest?.schemaVersion)
  const id = str(manifest?.id)
  const name = str(manifest?.name)
  const version = str(manifest?.version)

  if (schemaVersion !== PACK_SCHEMA_VERSION) {
    return { ok: false, skipped: false, reason: `unsupported schemaVersion: ${manifest?.schemaVersion}`, manifestPath }
  }
  if (!id) return { ok: false, skipped: false, reason: 'missing id', manifestPath }
  if (!version) return { ok: false, skipped: false, reason: 'missing version', manifestPath }

  const packDir = dirname(manifestPath)
  const resolveRef = (value, fallback) => {
    const ref = str(value) || fallback
    return ref ? (isAbsolute(ref) ? ref : resolve(packDir, ref)) : ''
  }

  return {
    ok: true,
    skipped: false,
    schemaVersion,
    id,
    name: name || id,
    version,
    status: str(manifest.status) || 'experimental',
    runtime: str(manifest.runtime),
    manifestPath,
    packDir,
    seedPath: resolveRef(manifest.seed, 'seed.md'),
    behaviorPath: resolveRef(manifest.behavior, 'behavior.md'),
    dataRoot: resolveRef(manifest.dataRoot, 'data'),
    windowsPath: resolveRef(manifest.windows, 'windows.json'),
    toolsPath: resolveRef(manifest.tools, 'tools.json'),
    socialPath: resolveRef(manifest.social, 'social.json'),
    manifest,
  }
}
