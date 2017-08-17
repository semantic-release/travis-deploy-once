var semver = require('semver')

module.exports = semver.lt(process.version, '8.0.0')
  ? function () { return null }
  : require('./index')
