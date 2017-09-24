import nock from 'nock';

export function github(GH_TOKEN = 'GITHUB_TOKEN', TRAVIS_REPO_SLUG = 'test_user/test_repo', priv = false) {
  return nock('https://api.github.com', {
    reqheaders: {Authorization: `token ${GH_TOKEN}`, 'user-agent': 'travis-deploy-once'},
  })
    .get(`/repos/${TRAVIS_REPO_SLUG}`)
    .reply(200, {private: priv});
}

export function travis(pro = false) {
  return nock(pro ? 'https://api.travis-ci.com' : 'https://api.travis-ci.org', {reqheaders: {'user-agent': 'Travis'}})
    .post('/auth/github')
    .reply(200, {access_token: 'TRAVIS_TOKEN'})
    .get('/users')
    .reply(200);
}

export function travisUnauthorized(pro = false) {
  return nock('https://api.travis-ci.org', {reqheaders: {'user-agent': 'Travis'}})
    .post('/auth/github')
    .reply(401);
}

export function authenticate(GH_TOKEN, TRAVIS_REPO_SLUG, pro) {
  return {github: github(GH_TOKEN, TRAVIS_REPO_SLUG, pro), travis: travis(pro)};
}

export function unauthorized(GH_TOKEN, TRAVIS_REPO_SLUG, pro) {
  return {github: github(GH_TOKEN, TRAVIS_REPO_SLUG, pro), travis: travisUnauthorized(pro)};
}
