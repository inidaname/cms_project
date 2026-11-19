import { test } from 'node:test'
import * as assert from 'node:assert'
import { build } from '../helper'

test('default root route requires a tenant API key', async (t) => {
  const app = await build(t)

  const res = await app.inject({
    url: '/'
  })

  assert.equal(res.statusCode, 401)
  assert.equal(res.json().message, 'Missing API Key (x-api-key header)')
})

test('health endpoint is public and reports status', async (t) => {
  const app = await build(t)

  const res = await app.inject({
    url: '/health'
  })

  assert.equal(res.statusCode, 200)
  const body = res.json()
  assert.equal(body.status, 'ok')
  assert.ok(typeof body.timestamp === 'string')
})

test('ping endpoint is public', async (t) => {
  const app = await build(t)

  const res = await app.inject({
    url: '/ping'
  })

  assert.equal(res.statusCode, 200)
  assert.deepStrictEqual(res.json(), { pong: true })
})
