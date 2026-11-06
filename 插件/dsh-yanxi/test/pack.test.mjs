import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadCharacterPack } from '../lib/pack.js'

test('loads a valid character pack', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'yanxi-pack-'))
  const manifestPath = join(dir, 'character.json')
  await writeFile(manifestPath, JSON.stringify({
    schemaVersion: 1, id: 'yanxi', name: '嫣汐', version: '0.1.0',
    seed: 'seed.md', behavior: 'behavior.md', dataRoot: 'data',
  }))
  const pack = await loadCharacterPack(dir, { packPath: manifestPath })
  assert.equal(pack.ok, true)
  assert.equal(pack.id, 'yanxi')
  assert.equal(pack.seedPath, join(dir, 'seed.md'))
  assert.equal(pack.dataRoot, join(dir, 'data'))
})

test('missing pack is skipped, not fatal', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'yanxi-pack-'))
  const pack = await loadCharacterPack(dir, { packPath: join(dir, 'missing.json') })
  assert.equal(pack.ok, false)
  assert.equal(pack.skipped, true)
})
