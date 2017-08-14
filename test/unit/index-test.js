const simple = require('simple-mock')
const test = require('tap').test

const travisDeployOnce = require('../../')

test('GitHub via environment varibale', (t) => {
  simple.mock(process.env, 'GH_TOKEN', 'gh-token-123')
  simple.mock(process.env, 'TRAVIS', 'true')
  simple.mock(process.env, 'TRAVIS_JOB_NUMBER', '67.1')
  simple.mock(process.env, 'TRAVIS_TEST_RESULT', '0')
  simple.mock(process.env, 'TRAVIS_REPO_SLUG', 'octocat/Hello-World')
  simple.mock(process.env, 'TRAVIS_BUILD_ID', '123')

  simple.mock(travisDeployOnce.internals, 'waterfall').callbackWith(null, true)

  travisDeployOnce({
    token: undefined
  })

  .then(() => {
    t.is(travisDeployOnce.internals.waterfall.callCount, 1)
    t.end()
  })

  .catch(t.error)
})

test('GitHub token missing', (t) => {
  simple.mock(process.env, 'GH_TOKEN', '')
  simple.mock(process.env, 'TRAVIS', 'true')
  simple.mock(process.env, 'TRAVIS_JOB_NUMBER', '67.1')
  simple.mock(process.env, 'TRAVIS_TEST_RESULT', '0')
  simple.mock(process.env, 'TRAVIS_REPO_SLUG', 'octocat/Hello-World')
  simple.mock(process.env, 'TRAVIS_BUILD_ID', '123')

  simple.mock(travisDeployOnce.internals, 'waterfall')

  travisDeployOnce({
    token: undefined
  })

  .then(() => {
    t.fail('should not resolve')
  })

  .catch((error) => {
    t.is(error.message, 'GitHub token missing')
    t.end()
  })
})
