const {promisify} = require('util');
const Travis = require('travis-ci');

/**
 * Authenticate with Travis and return the API client.
 * 
 * @param {Object} env Environment variables with GH_TOKEN and TRAVIS_REPO_SLUG
 * @return {Promise<Travis>} Promise that resolve to the authenticated Travis API client
 */
module.exports = async (travisOpts = {pro: false}, env) => {
  const travis = new Travis(Object.assign({version: '2.0.0', headers: {'user-agent': 'Travis'}}, travisOpts));
  await promisify(travis.authenticate.bind(travis))({github_token: env.GH_TOKEN});
  return travis;
};
