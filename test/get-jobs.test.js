import test from 'ava';
import nock from 'nock';
import getJobs from '../lib/get-jobs';
import {api} from './helpers/mock-travis';

// Save the current process.env
const envBackup = Object.assign({}, process.env);

test.beforeEach(() => {
  process.env = {TRAVIS_REPO_SLUG: 'test_user/test_repo', GH_TOKEN: 'GITHUB_TOKEN'};
});

test.afterEach.always(() => {
  delete process.env.TRAVIS_URL;
  // Restore process.env
  process.env = envBackup;
  nock.cleanAll();
});

test.serial('Return job list', async t => {
  const travisToken = 'TRAVIS_TOKEN';
  const travisOpts = {};
  const buildId = 123;
  const jobsFirst = [{id: 456, state: 'started'}, {id: 789, state: 'started'}];
  const jobsSecond = [{id: 456, state: 'passed'}, {id: 789, state: 'passed'}];
  const travis = api({travisOpts, travisToken})
    .get(`/builds/${buildId}`)
    .reply(200, {jobs: jobsFirst})
    .get(`/builds/${buildId}`)
    .reply(200, {jobs: jobsSecond});

  t.deepEqual(jobsFirst, await getJobs(travisOpts, travisToken, buildId));
  t.deepEqual(jobsSecond, await getJobs(travisOpts, travisToken, buildId));
  t.true(travis.isDone());
});

test.serial('Return job list with Travis Pro', async t => {
  const travisToken = 'TRAVIS_TOKEN';
  const travisOpts = {pro: true};
  const buildId = 123;
  const jobsFirst = [{id: 456, state: 'started'}, {id: 789, state: 'started'}];
  const jobsSecond = [{id: 456, state: 'passed'}, {id: 789, state: 'passed'}];
  const travis = api({travisOpts, travisToken})
    .get(`/builds/${buildId}`)
    .reply(200, {jobs: jobsFirst})
    .get(`/builds/${buildId}`)
    .reply(200, {jobs: jobsSecond});

  t.deepEqual(jobsFirst, await getJobs(travisOpts, travisToken, buildId));
  t.deepEqual(jobsSecond, await getJobs(travisOpts, travisToken, buildId));
  t.true(travis.isDone());
});

test.serial('Return job list with Travis Enterprise', async t => {
  const travisToken = 'TRAVIS_TOKEN';
  const travisOpts = {pro: false, enterprise: 'https://travis.example.com/api'};
  const buildId = 123;
  const jobsFirst = [{id: 456, state: 'started'}, {id: 789, state: 'started'}];
  const jobsSecond = [{id: 456, state: 'passed'}, {id: 789, state: 'passed'}];
  const travis = api({travisOpts, travisToken})
    .get(`/builds/${buildId}`)
    .reply(200, {jobs: jobsFirst})
    .get(`/builds/${buildId}`)
    .reply(200, {jobs: jobsSecond});

  t.deepEqual(jobsFirst, await getJobs(travisOpts, travisToken, buildId));
  t.deepEqual(jobsSecond, await getJobs(travisOpts, travisToken, buildId));
  t.true(travis.isDone());
});

test.serial('Return job list with Travis Enterprise set with TRAVIS_URL', async t => {
  process.env.TRAVIS_URL = 'https://travis.example.com/api';
  const travisToken = 'TRAVIS_TOKEN';
  const travisOpts = {pro: false};
  const buildId = 123;
  const jobsFirst = [{id: 456, state: 'started'}, {id: 789, state: 'started'}];
  const jobsSecond = [{id: 456, state: 'passed'}, {id: 789, state: 'passed'}];
  const travis = api({travisOpts: {pro: false, enterprise: 'https://travis.example.com/api'}, travisToken})
    .get(`/builds/${buildId}`)
    .reply(200, {jobs: jobsFirst})
    .get(`/builds/${buildId}`)
    .reply(200, {jobs: jobsSecond});

  t.deepEqual(jobsFirst, await getJobs(travisOpts, travisToken, buildId));
  t.deepEqual(jobsSecond, await getJobs(travisOpts, travisToken, buildId));
  t.true(travis.isDone());
});

test.serial('Throws error if GH_TOKEN is not authenticated with Travis', async t => {
  const travisToken = 'TRAVIS_TOKEN';
  const travisOpts = {};
  const buildId = 123;
  const travis = api({travisOpts, travisToken})
    .get(`/builds/${buildId}`)
    .reply(404, {file: 'not found'});

  await t.throws(
    getJobs(travisOpts, travisToken, buildId),
    /The GitHub user of the "GH_TOKEN" has not authenticated Travis CI yet/
  );
  t.true(travis.isDone());
});

test.serial('Throws an error if server returns and error', async t => {
  const travisToken = 'TRAVIS_TOKEN';
  const travisOpts = {};
  const buildId = 123;
  const travis = api({travisOpts, travisToken})
    .get(`/builds/${buildId}`)
    .reply(401);

  const error = await t.throws(getJobs(travisOpts, travisToken, buildId), Error);
  t.is(error.statusCode, 401);
  t.is(error.name, 'HTTPError');
  t.true(travis.isDone());
});
