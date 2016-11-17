require('babel-polyfill')
const Promise = require('bluebird')
const {promisify} = Promise
const request = require('request-promise')
const Travis = require('travis-ci')

module.exports = async function travisDeployOnce ({token} = {}) {
  token = token || process.env.GH_TOKEN
  if (!token) throw new Error('GitHub token missing')
  if (!process.env.TRAVIS === 'true') throw new Error('Not running on Travis')
  if (!process.env.TRAVIS_JOB_NUMBER.endsWith('.1')) return null
  if (process.env.TRAVIS_TEST_RESULT === '1') return false
  if (process.env.TRAVIS_TEST_RESULT !== '0') throw new Error('Not running in Travis after_success hook')

  const {private: pro} = await request({
    json: true,
    url: `https://api.github.com/repos/${process.env.TRAVIS_REPO_SLUG}`,
    headers: {
      Authorization: `token ${token}`,
      'user-agent': 'travis-deploy-once'
    }
  })

  const travis = new Travis({
    pro,
    version: '2.0.0',
    headers: {
      'user-agent': 'Travis'
    }
  })

  await promisify(travis.authenticate, {context: travis})({
    github_token: token
  })

  const buildId = parseInt(process.env.TRAVIS_BUILD_ID, 10)
  const buildApi = travis.builds(buildId)
  const {build: {job_ids: jobs}} = await promisify(buildApi.get, {context: buildApi})()

  const currentJobId = parseInt(process.env.TRAVIS_JOB_ID, 10)
  for (let attempt = 1; attempt <= 100; attempt++) {
    let successes = 0
    for (let jobId of jobs) {
      if (jobId === currentJobId) {
        successes++
        continue
      }

      const jobApi = travis.jobs(jobId)
      const {job} = await promisify(jobApi.get, {context: jobApi})()

      if (job.allow_failure) {
        successes++
        continue
      }

      if (job.state === 'created' || job.state === 'started') {
        console.error(`[Travis Deploy Once]: Aborting attempt ${attempt}, because job ${job.number} is still pending.`)
        break
      }

      if (job.state === 'errored' || job.state === 'failed') {
        console.error(`[Travis Deploy Once]: Aborting at attempt ${attempt}. Job ${job.number} failed.`)
        return false
      }

      if (job.state === 'passed') {
        successes++
      }
    }

    if (successes >= jobs.length) {
      console.error(`[Travis Deploy Once]: Success at attempt ${attempt}. All ${successes} jobs passed.`)
      return true
    }

    await Promise.delay(3000)
  }

  throw new Error('Timeout. Could not get accumulated results after 100 attempts.')
}
