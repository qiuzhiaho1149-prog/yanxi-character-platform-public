import { test } from 'node:test'
import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

process.env.DSH_LIFE_ROOT = await fs.mkdtemp(path.join(os.tmpdir(), 'life-test-'))
const { apply, resolveInside } = await import('../lib/index.js')

function mockCtx() {
  const tools = new Map()
  return {
    tools: { register(t) { tools.set(t.name, t) } },
    logger: { info() {} },
    toolsMap: tools,
  }
}

test('路径不能越界', async () => {
  const root = process.env.DSH_LIFE_ROOT
  assert.equal(resolveInside(root, 'a.txt'), path.join(root, 'a.txt'))
  assert.throws(() => resolveInside(root, '../x'), /越界/)
  assert.throws(() => resolveInside(root, '/etc/passwd'), /相对路径/)
  assert.throws(() => resolveInside(root, 'a/../../x'), /越界/)
})

test('写读列建', async () => {
  const ctx = mockCtx()
  apply(ctx)
  const write = ctx.toolsMap.get('life_write')
  const read = ctx.toolsMap.get('life_read')
  const list = ctx.toolsMap.get('life_list')
  const mkdir = ctx.toolsMap.get('life_mkdir')
  assert.ok(write && read && list && mkdir)

  assert.equal((await write.execute({ path: '日记/今天.md', content: '今天很好' })).ok, true)
  assert.equal((await read.execute({ path: '日记/今天.md' })).text, '今天很好')
  assert.equal((await mkdir.execute({ path: '作品' })).ok, true)
  const l = await list.execute({ path: '' })
  assert.match(l.text, /日记/)
  assert.match(l.text, /作品/)
  assert.equal((await read.execute({ path: '../secret' })).ok, false)
  assert.equal((await write.execute({ path: '/etc/x', content: 'x' })).ok, false)
})
