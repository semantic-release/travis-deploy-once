const semver = require('semver')

module.exports = versions => {
  // if there is only one candidate, then it's the winner
  if (!Array.isArray(versions) || versions.length === 1) return 1

  // if there is latest stable it's the winner
  // https://docs.travis-ci.com/user/languages/javascript-with-nodejs/#Specifying-Node.js-versions
  const stable = versions.indexOf('node') + 1
  if (stable) return stable

  // Convert to Strings as expected by semver
  versions = versions.map(version => String(version))
  // otherwise we use the lower bound of all valid semver ranges
  const validRanges = versions.filter(semver.validRange)
  const lowVersionBoundaries = validRanges
  .map(semver.Range)
  .map(r => r.set[0][0].semver.version)

  // then we find the highest of those
  const highestVersion = semver.sort(Array.from(lowVersionBoundaries)).pop()
  const highestRange = validRanges[lowVersionBoundaries.indexOf(highestVersion)]

  // and make its build job the winner
  return versions.indexOf(highestRange) + 1
}
