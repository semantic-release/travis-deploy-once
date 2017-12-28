module.exports = ({enterprise, pro} = {}) =>
  enterprise || process.env.TRAVIS_URL || (pro ? 'https://api.travis-ci.com' : 'https://api.travis-ci.org');
