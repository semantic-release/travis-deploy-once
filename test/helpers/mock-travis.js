import nock from 'nock';

/* eslint camelcase: ["error", {properties: "never"}] */

export function authenticate({GH_TOKEN = process.env.GH_TOKEN, pro = false} = {}) {
  return nock(pro ? 'https://api.travis-ci.com' : 'https://api.travis-ci.org', {reqheaders: {'user-agent': 'Travis'}})
    .post('/auth/github', {github_token: GH_TOKEN})
    .reply(200, {access_token: 'TRAVIS_TOKEN'})
    .get('/users')
    .reply(200);
}

export function unauthorized() {
  return nock('https://api.travis-ci.org', {reqheaders: {'user-agent': 'Travis'}})
    .post('/auth/github')
    .reply(401);
}
