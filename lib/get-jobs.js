const {promisify} = require('util');

/**
 * Retrieve the Travis jobs for the current build.
 *
 * @param {Travis} travis Travis API client
 * @param {Number} buildId The current build ID
 * @return {Promise<Array>} Promise that resolves to the list of jobs
 */
module.exports = async (travis, buildId) => {
  const buildApi = travis.builds(buildId);
  try {
    const {jobs} = await promisify(buildApi.get.bind(buildApi))();
    return jobs;
  } catch (err) {
    // https://github.com/semantic-release/travis-deploy-once/issues/3
    // https://github.com/pwmckenna/node-travis-ci/issues/17
    if (err.file === 'not found') {
      throw new Error(
        'The GitHub user of the "GH_TOKEN" has not authenticated Travis CI yet. Go to https://travis-ci.com/, login with the GitHub user of this token and then restart this job.'
      );
    }
    throw err;
  }
};
