const validate = require('./validate');
const getLogger = require('./get-logger');
const getClient = require('./get-client');
const getJobs = require('./get-jobs');
const electBuildLeader = require('./elect-build-leader');
const waitForOtherJobs = require('./wait-for-other-jobs');

/**
 * Determine if the current job is the build leader (highest node version, smallest version in case multiple identical versions) and if it is wait for all other job to be successful or for one to fails.
 * 
 * @param {Object} options
 * @return {Promise<Boolean>} Promise that resolves to `true` if all the other jobs are successful, `false` if at least one job in the build has failed, `null` if this job is not the build leader.
 * @throws {Error} if doesn't run on Travis
 * @throws {Error} if the Github authentication token is missing
 * @throws {Error} if the Github authentication token is not authorized with Travis
 * @throws {Error} if this job doesn't run on after_success step (TRAVIS_TEST_RESULT is set)
 */
module.exports = async (
  {travisOpts = {}, BUILD_LEADER_ID = process.env.BUILD_LEADER_ID, GH_TOKEN = process.env.GH_TOKEN} = {}
) => {
  const env = Object.assign({}, process.env, {BUILD_LEADER_ID, GH_TOKEN});
  const logger = getLogger('Travis Deploy Once');

  if (env.TRAVIS_TEST_RESULT === '1') {
    logger.error('The current job test phase has failed.');
    return false;
  }

  validate(env);

  const travis = await getClient(travisOpts, env);
  const buildId = parseInt(env.TRAVIS_BUILD_ID, 10);
  const jobs = await getJobs(travis, buildId);
  if (jobs.length === 1) {
    logger.log('There is only one job for this build.');
    return true;
  }

  const buildLeader = env.BUILD_LEADER_ID || electBuildLeader(jobs.map(job => job.config.node_js), logger);
  const currentJobId = parseInt(env.TRAVIS_JOB_ID, 10);

  if (!env.TRAVIS_JOB_NUMBER.endsWith(`.${buildLeader}`)) {
    logger.log(`The current job (${env.TRAVIS_JOB_NUMBER}) is not the build leader.`);
    return null;
  }

  const result = await waitForOtherJobs(travis, buildId, currentJobId, jobs, logger);
  result
    ? logger.log('All jobs are successful for this build!')
    : logger.error('At least one job has failed for this build.');
  return result;
};
