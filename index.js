const {promisify} = require('util')

const request = require('axios')
const Travis = require('travis-ci')

const electBuildLeader = require('./elect-build-leader')

module.exports = async function travisDeployOnce (input) {
  const env = Object.assign({}, process.env, input)

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
  try {
    var {jobs} = await promisify(buildApi.get.bind(buildApi))()
  } catch (err) {
    // https://github.com/semantic-release/travis-deploy-once/issues/3
    // https://github.com/pwmckenna/node-travis-ci/issues/17
    if (err.file === 'not found') {
      throw new Error(`The GitHub user of the "GH_TOKEN" has not authenticated Travis CI yet.
Go to https://travis-ci.com/, login with the GitHub user of this token and then restart this job.`)
    }
    throw err
  }

  const buildLeader = env.BUILD_LEADER_ID || electBuildLeader(
    jobs.map(job => job.config.node_js)
  )

  if (!env.TRAVIS_JOB_NUMBER.endsWith(`.${buildLeader}`)) return null
  if (env.TRAVIS_TEST_RESULT === '1') return false
  if (jobs.length === 1) return true

  const currentJobId = parseInt(env.TRAVIS_JOB_ID, 10)
  let attempt = 0
  while (++attempt) {
    let successes = 0
    for (let {id} of jobs) {
      if (id === currentJobId) {
        successes++
        continue
      }

      const jobApi = travis.jobs(id)
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
