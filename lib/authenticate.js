module.exports = authenticate

function authenticate (state, callback) {
  state.travis.authenticate({github_token: state.token}, (error) => {
    if (error) {
      return callback(error)
    }

    callback()
  })
}
