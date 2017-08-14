const simple = require('simple-mock')
const test = require('tap').test

const getClient = require('../../lib/get-client')

test('GitHub request error', (t) => {
  simple.mock(getClient.internals, 'get').callbackWith(new Error('GitHub oops'))
  getClient({}, (error) => {
    t.is(error.message, 'GitHub oops')
    t.end()
  })
})

test('GitHub returns 401', (t) => {
  simple.mock(getClient.internals, 'get').callbackWith(null, {statusCode: 404}, {message: 'Not Found'})
  getClient({}, (error) => {
    t.ok(/GitHub error/.test(error.message))
    t.end()
  })
})
