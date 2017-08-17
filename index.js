const {promisify} = require('util')

const request = require('axios')
const Travis = require('travis-ci')

const electBuildLeader = require('./elect-build-leader')

module.exports = async function travisDeployOnce (env = process.env) {
  if (!env.GH_TOKEN) throw new Error('GitHub token missing')
  if (env.TRAVIS !== 'true') throw new Error('Not running on Travis')
  if (env.TRAVIS_TEST_RESULT !== '0') throw new Error('Not running in Travis after_success hook')

  const {private: pro} = await request({
    url: `https://api.github.com/repos/${env.TRAVIS_REPO_SLUG}`,
    headers: {
      Authorization: `token ${env.GH_TOKEN}`,
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

  await promisify(travis.authenticate.bind(travis))({
    github_token: env.GH_TOKEN
  })

  const buildId = parseInt(env.TRAVIS_BUILD_ID, 10)
  const buildApi = travis.builds(buildId)
  const {build: {config, job_ids: jobs}} = await promisify(buildApi.get.bind(buildApi))()

  const buildLeader = env.BUILD_LEADER_ID || (config.node_js
    ? electBuildLeader(config.node_js)
    : 1)

  if (!env.TRAVIS_JOB_NUMBER.endsWith(`.${buildLeader}`)) return null
  if (env.TRAVIS_TEST_RESULT === '1') return false
  if (jobs.length === 1) return true

  const currentJobId = parseInt(env.TRAVIS_JOB_ID, 10)
  let attempt = 0
  while (++attempt) {
    let successes = 0
    for (let jobId of jobs) {
      if (jobId === currentJobId) {
        successes++
        continue
      }

      const jobApi = travis.jobs(jobId)
      const {job} = await promisify(jobApi.get.bind(jobApi))()

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

    await new Promise(resolve => setTimeout(resolve, 3000))
  }
}
