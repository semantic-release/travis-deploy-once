import nock from 'nock';

/* eslint camelcase: ["error", {properties: "never"}] */

export function authenticate(
  {travisOpts: {pro = false, enterprise} = {}, travisToken = 'TRAVIS_TOKEN', githubToken = process.env.GH_TOKEN} = {}
) {
  return nock(enterprise || (pro ? 'https://api.travis-ci.com' : 'https://api.travis-ci.org'), {
    reqheaders: {'user-agent': 'Travis'},
  })
    .post('/auth/github', {github_token: githubToken})
    .reply(200, {access_token: travisToken});
}

export function api({travisOpts: {pro = false, enterprise} = {}, travisToken = 'TRAVIS_TOKEN'} = {}) {
  return nock(enterprise || (pro ? 'https://api.travis-ci.com' : 'https://api.travis-ci.org'), {
    reqheaders: {
      'user-agent': 'Travis',
      accept: 'application/vnd.travis-ci.2+json',
      authorization: `token ${travisToken}`,
    },
  });
}

export function unauthorized() {
  return nock('https://api.travis-ci.org', {reqheaders: {'user-agent': 'Travis'}})
    .post('/auth/github')
    .reply(401);
}
