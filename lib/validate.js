/**
 * Verify environment:
 * - Runs on Travis
 * - Has a Github authentication token
 * - Runs on after_success step (TRAVIS_TEST_RESULT is set)
 *
 * @param {String} githubToken Github authentication token
 * @throws {Error} if one of the verification fails
 */
module.exports = githubToken => {
  if (process.env.TRAVIS !== 'true') throw new Error('Not running on Travis');
  if (!githubToken) throw new Error('GitHub authentication missing');
};
