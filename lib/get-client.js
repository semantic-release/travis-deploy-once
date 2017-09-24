const {promisify} = require('util');
const request = require('axios');
const Travis = require('travis-ci');

/**
 * Authenticate with Travis and return the API client.
 * 
 * @param {Object} env Environment variables with GH_TOKEN and TRAVIS_REPO_SLUG
 * @return {Promise<Travis>} Promise that resolve to the authenticated Travis API client
 */
module.exports = async env => {
  const {data: {private: pro}} = await request({
    url: `https://api.github.com/repos/${env.TRAVIS_REPO_SLUG}`,
    headers: {Authorization: `token ${env.GH_TOKEN}`, 'user-agent': 'travis-deploy-once'},
  });
  const travis = new Travis({pro, version: '2.0.0', headers: {'user-agent': 'Travis'}});
  await promisify(travis.authenticate.bind(travis))({github_token: env.GH_TOKEN});
  return travis;
};
