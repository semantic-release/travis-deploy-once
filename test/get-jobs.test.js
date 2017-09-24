import test from 'ava';
import nock from 'nock';
import getJobs from '../lib/get-jobs';
import {authenticate} from './helpers/mock-api';
import getClient from '../lib/get-client';

test.beforeEach(t => {
  t.context.env = process.env;
  process.env.TRAVIS_REPO_SLUG = 'test_user/test_repo';
  process.env.GH_TOKEN = 'GITHUB_TOKEN';
});

test.afterEach.always(t => {
  process.env = t.context.env;
  nock.cleanAll();
});

test.serial('Return job list', async t => {
  const buildId = 123;
  const jobsFirst = [{id: 456, state: 'started'}, {id: 789, state: 'started'}];
  const jobsSecond = [{id: 456, state: 'passed'}, {id: 789, state: 'passed'}];
  const {travis} = authenticate();
  const client = await getClient(process.env);

  travis
    .get(`/builds/${buildId}`)
    .reply(200, {jobs: jobsFirst})
    .get(`/builds/${buildId}`)
    .reply(200, {jobs: jobsSecond});

  t.deepEqual(jobsFirst, await getJobs(client, buildId));
  t.deepEqual(jobsSecond, await getJobs(client, buildId));
  t.true(travis.isDone());
});

test.serial('Throws error if GH_TOKEN is not authenticated with Travis', async t => {
  const buildId = 123;
  const {travis} = authenticate();
  const client = await getClient(process.env);

  travis.get(`/builds/${buildId}`).reply(404, {file: 'not found'});

  await t.throws(getJobs(client, buildId), /The GitHub user of the "GH_TOKEN" has not authenticated Travis CI yet/);
  t.true(travis.isDone());
});

test.serial('Throws an error if server returns and error', async t => {
  const buildId = 123;
  const {travis} = authenticate();
  const client = await getClient(process.env);

  travis.get(`/builds/${buildId}`).reply(401);

  const error = await t.throws(getJobs(client, buildId));
  t.is(error, 401);
  t.true(travis.isDone());
});
