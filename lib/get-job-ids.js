module.exports = getJobIds

function getJobIds (state, callback) {
  state.travis.builds(state.buildId).get((error, result) => {
    if (error) {
      return callback(error)
    }

    state.jobIds = result.build.job_ids

    callback()
  })
}
