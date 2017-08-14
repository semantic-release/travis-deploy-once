module.exports = getClient

const internals = module.exports.internals = {}
internals.get = require('request').defaults({json: true}).get
internals.Travis = require('travis-ci')

function getClient (state, callback) {
  internals.get({
    url: `https://api.github.com/repos/${process.env.TRAVIS_REPO_SLUG}`,
    headers: {
      Authorization: `token ${state.token}`,
      'user-agent': 'travis-deploy-once'
    }
  }, (error, response, body) => {
    if (error) {
      return callback(error)
    }

    if (response.statusCode >= 300) {
      return callback(new Error(`GitHub error ${response.statusCode}: ${JSON.stringify(body, null, 2)}`))
    }

    const repositoryIsPrivate = body.private
    state.travis = new internals.Travis({
      pro: repositoryIsPrivate,
      version: '2.0.0',
      headers: {
        'user-agent': 'Travis'
      }
    })

    callback()
  })
}
