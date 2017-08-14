module.exports = travisDeployOnce

const internals = module.exports.internals = {}
internals.waterfall = require('async').waterfall

const authenticate = require('./lib/authenticate')
const getClient = require('./lib/get-client')
const getJobIds = require('./lib/get-job-ids')
const waitForOtherJobs = require('./lib/wait-for-other-jobs')

function travisDeployOnce (options) {
  const token = (options && options.token) || process.env.GH_TOKEN
  if (!token) return Promise.reject(new Error('GitHub token missing'))
  if (process.env.TRAVIS !== 'true') return Promise.reject(new Error('Not running on Travis'))
  if (!process.env.TRAVIS_JOB_NUMBER.endsWith('.1')) return Promise.resolve(null)
  if (process.env.TRAVIS_TEST_RESULT === '1') return Promise.resolve(false)
  if (process.env.TRAVIS_TEST_RESULT !== '0') return Promise.reject(new Error('Not running in Travis after_success hook'))

  const state = {
    token,
    repoSlug: process.env.TRAVIS_REPO_SLUG,
    buildId: parseInt(process.env.TRAVIS_BUILD_ID, 10)
  }

  return new Promise((resolve, reject) => {
    internals.waterfall([
      getClient.bind(null, state),
      authenticate.bind(null, state),
      getJobIds.bind(null, state),
      waitForOtherJobs.bind(null, state)
    ], function (error, allOtherJobsSucceeded) {
      if (error) {
        return reject(error)
      }

      resolve(allOtherJobsSucceeded)
    })
  })
}
