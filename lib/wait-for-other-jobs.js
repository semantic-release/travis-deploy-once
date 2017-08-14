module.exports = waitForOtherJobs

const async = require('async')
const pluralize = require('pluralize')

function waitForOtherJobs (state, callback) {
  async.retry({times: 100, interval: 3000}, checkOtherJobs.bind(null, state), callback)
}

function checkOtherJobs (state, callback) {
  const getJobStates = state.jobIds.map((id) => {
    const jobApi = state.travis.jobs(id)
    return jobApi.get.bind(jobApi)
    // return function get (callback) {
    //   jobApi.get((error, result) => {
    //     console.log(`\nerror ==============================`)
    //     console.log(error)
    //
    //     console.log(`\nresult ==============================`)
    //     console.log(result)
    //
    //
    //     callback(error, results)
    //   })
    // }
  })

  async.parallelLimit(getJobStates, 10, (error, results) => {
    if (error) {
      return callback(error)
    }

    const failedJobs = results.filter(isFailed)
    if (failedJobs.length) {
      console.error(`[Travis Deploy Once]: Aborting due to ${pluralize('failed job', failedJobs.length, true)}.`)
      return callback(null, false)
    }

    const pendingJobs = results.filter(isPending)
    if (pendingJobs.length) {
      console.error(`[Travis Deploy Once]: Aborting due to ${pluralize('pending job', failedJobs.length, true)}.`)
      return callback(new Error('Waiting for pending jobs'))
    }

    callback(null, true)
  })
}

function isFailed (job) {
  return job.state === 'errored' || job.state === 'failed'
}

function isPending (job) {
  return job.state === 'created' || job.state === 'started'
}
