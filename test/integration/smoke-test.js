const nock = require('nock')
const simple = require('simple-mock')
const test = require('tap').test

const deployOnce = require('../../')

test('travis-deploy-once happy path', function (t) {
  simple.mock(process.env, 'GH_TOKEN', '')
  simple.mock(process.env, 'TRAVIS', 'true')
  simple.mock(process.env, 'TRAVIS_JOB_NUMBER', '67.1')
  simple.mock(process.env, 'TRAVIS_TEST_RESULT', '0')
  simple.mock(process.env, 'TRAVIS_REPO_SLUG', 'octocat/Hello-World')
  simple.mock(process.env, 'TRAVIS_BUILD_ID', '123')

  const githubMock = nock('https://api.github.com', {encodedQueryParams: true})
    .get('/repos/octocat/Hello-World')
    .reply(200, {
      private: false
    })

  const travisMock = nock('https://api.travis-ci.org', {encodedQueryParams: true})
    // https://docs.travis-ci.com/api/#with-a-github-token
    .post('/auth/github', {github_token: 'my-github-token-123'})
    .reply(200, {access_token: 'travis-access-token-456'})

    // used to check authentication
    // https://docs.travis-ci.com/api/#users
    .get('/users', {access_token: 'travis-access-token-456'})
    .reply(200, {})

    // https://docs.travis-ci.com/api/#builds
    .get('/builds/123')
    .reply(200, {
      build: {
        job_ids: [101, 102, 103]
      }
    })

    // https://docs.travis-ci.com/api/#jobs
    .get('/jobs/101')
    .reply(200, {
      job: {
        state: 'passed'
      }
    })

    .get('/jobs/102')
    .reply(200, {
      job: {
        state: 'passed'
      }
    })

    .get('/jobs/103')
    .reply(200, {
      job: {
        state: 'passed'
      }
    })

  deployOnce({
    token: 'my-github-token-123'
  })

  .then((allOtherJobsSucceeded) => {
    t.is(allOtherJobsSucceeded, true)

    t.is(githubMock.pendingMocks()[0], undefined)
    t.is(travisMock.pendingMocks()[0], undefined)
    t.end()
  })

  .catch(t.error)
})

test('Repository cannot be found', function (t) {
  simple.mock(process.env, 'GH_TOKEN', '')
  simple.mock(process.env, 'TRAVIS', 'true')
  simple.mock(process.env, 'TRAVIS_JOB_NUMBER', '67.1')
  simple.mock(process.env, 'TRAVIS_TEST_RESULT', '0')
  simple.mock(process.env, 'TRAVIS_REPO_SLUG', 'octocat/Hello-World')
  simple.mock(process.env, 'TRAVIS_BUILD_ID', '123')

  nock('https://api.github.com', {encodedQueryParams: true})
    .get('/repos/octocat/Hello-World')
    .reply(404, {
      message: 'Not Found'
    })

  deployOnce({
    token: 'my-github-token-123'
  })

  .then(() => {
    t.fail('should not resolve')
  })

  .catch((error) => {
    t.ok(/GitHub error/.test(error.message))
    t.end()
  })
})
