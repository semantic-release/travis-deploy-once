const validate = require('./validate');
const getLogger = require('./get-logger');
const getToken = require('./get-token');
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
module.exports = async ({
  travisOpts = {},
  buildLeaderId = process.env.BUILD_LEADER_ID,
  githubToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN,
} = {}) => {
  const logger = getLogger('Travis Deploy Once');

  validate(githubToken);

  const buildId = parseInt(process.env.TRAVIS_BUILD_ID, 10);
  const travisToken = await getToken(travisOpts, githubToken);
  const jobs = await getJobs(travisOpts, travisToken, buildId);
  if (jobs.length === 1) {
    logger.log('There is only one job for this build.');
    return true;
  }

  const versions = jobs.map(job => job.config.node_js);
  if (versions.filter(job => Boolean(job)).length === 0 && !buildLeaderId) {
    logger.log(`There is no job in this build defining a node version. Electing job (${jobs.length}) as build leader.`);
    buildLeaderId = jobs.length;
  }

  if (!process.env.TRAVIS_JOB_NUMBER.endsWith(`.${buildLeaderId || electBuildLeader(versions, logger)}`)) {
    logger.log(`The current job (${process.env.TRAVIS_JOB_NUMBER}) is not the build leader.`);
    return null;
  }

  const currentJobId = parseInt(process.env.TRAVIS_JOB_ID, 10);
  const result = await waitForOtherJobs(travisOpts, travisToken, buildId, currentJobId, jobs, logger);
  if (result) {
    logger.log('All jobs are successful for this build!');
  } else {
    logger.error('At least one job has failed for this build.');
  }
  return result;
};
