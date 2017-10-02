import test from 'ava';
import nock from 'nock';
import {stub} from 'sinon';
import {authenticate} from './helpers/mock-travis';
import getLogger from '../lib/get-logger';
import getClient from '../lib/get-client';
import waitForOtherJobs from '../lib/wait-for-other-jobs';

test.beforeEach(t => {
  t.context.env = process.env;
  process.env.TRAVIS_REPO_SLUG = 'test_user/test_repo';
  process.env.GH_TOKEN = 'GITHUB_TOKEN';
  t.context.logger = getLogger();
  t.context.log = stub(t.context.logger, 'log');
  t.context.error = stub(t.context.logger, 'error');
});

test.afterEach.always(t => {
  process.env = t.context.env;
  nock.cleanAll();
});

test.serial('Wait for jobs to complete, ignoring current one and return true', async t => {
  const buildId = 123;
  const currentJobId = 2;
  const jobsFirst = [
    {id: 1, number: '1.1', state: 'created'},
    {id: currentJobId, number: '1.2', state: 'started'},
    {id: 3, number: '1.3', state: 'created'},
  ];
  const jobsSecond = [
    {id: 1, number: '1.1', state: 'passed'},
    {id: currentJobId, number: '1.2', state: 'started'},
    {id: 3, number: '1.3', state: 'started'},
  ];
  const jobsThird = [
    {id: 1, number: '1.1', state: 'passed'},
    {id: currentJobId, number: '1.2', state: 'started'},
    {id: 3, number: '1.3', state: 'passed'},
  ];
  const travis = authenticate();
  const client = await getClient({}, process.env);

  travis
    .get(`/builds/${buildId}`)
    .reply(200, {jobs: jobsSecond})
    .get(`/builds/${buildId}`)
    .reply(200, {jobs: jobsThird});

  t.true(
    await waitForOtherJobs(client, buildId, currentJobId, jobsFirst, t.context.logger, {
      forever: true,
      factor: 1,
      minTimeout: 1,
    })
  );

  t.true(t.context.log.calledThrice);
  t.is(t.context.log.firstCall.args[0], 'Aborting attempt 1, because of pending job(s): 1.1, 1.3.');
  t.is(t.context.log.secondCall.args[0], 'Aborting attempt 2, because of pending job(s): 1.3.');
  t.is(t.context.log.thirdCall.args[0], 'Success at attempt 3. All 3 jobs passed.');
  t.true(travis.isDone());
});

test.serial('Return false as soon as a job fails', async t => {
  const buildId = 123;
  const currentJobId = 2;
  const jobsFirst = [
    {id: 1, number: '1.1', state: 'created'},
    {id: currentJobId, number: '1.2', state: 'started'},
    {id: 3, number: '1.3', state: 'created'},
  ];
  const jobsSecond = [
    {id: 1, number: '1.1', state: 'passed'},
    {id: currentJobId, number: '1.2', state: 'started'},
    {id: 3, number: '1.3', state: 'started'},
  ];
  const jobsThird = [
    {id: 1, number: '1.1', state: 'created'},
    {id: currentJobId, number: '1.2', state: 'started'},
    {id: 3, number: '1.3', state: 'errored'},
  ];
  const travis = authenticate();
  const client = await getClient({}, process.env);

  travis
    .get(`/builds/${buildId}`)
    .reply(200, {jobs: jobsSecond})
    .get(`/builds/${buildId}`)
    .reply(200, {jobs: jobsThird});

  t.false(
    await waitForOtherJobs(client, buildId, currentJobId, jobsFirst, t.context.logger, {
      forever: true,
      factor: 1,
      minTimeout: 1,
    })
  );

  t.true(t.context.log.calledTwice);
  t.true(t.context.error.calledOnce);
  t.is(t.context.log.firstCall.args[0], 'Aborting attempt 1, because of pending job(s): 1.1, 1.3.');
  t.is(t.context.log.secondCall.args[0], 'Aborting attempt 2, because of pending job(s): 1.3.');
  t.is(t.context.error.firstCall.args[0], 'Aborting at attempt 3. Job 1.3 failed.');
  t.true(travis.isDone());
});

test.serial('Handle API errors', async t => {
  const buildId = 123;
  const currentJobId = 2;
  const jobsFirst = [
    {id: 1, number: '1.1', state: 'created'},
    {id: currentJobId, number: '1.2', state: 'started'},
    {id: 3, number: '1.3', state: 'created'},
  ];
  const jobsSecond = [
    {id: 1, number: '1.1', state: 'passed'},
    {id: currentJobId, number: '1.2', state: 'started'},
    {id: 3, number: '1.3', state: 'passed'},
  ];
  const travis = authenticate();
  const client = await getClient({}, process.env);

  travis
    .get(`/builds/${buildId}`)
    .reply(500, 'server error')
    .get(`/builds/${buildId}`)
    .reply(200, {jobs: jobsSecond});

  t.true(
    await waitForOtherJobs(client, buildId, currentJobId, jobsFirst, t.context.logger, {
      forever: true,
      factor: 1,
      minTimeout: 1,
    })
  );

  t.is(t.context.log.firstCall.args[0], 'Aborting attempt 1, because of pending job(s): 1.1, 1.3.');
  t.is(t.context.log.secondCall.args[0], 'Failed attempt 2, because Travis API returned the error: server error.');
  t.is(t.context.log.thirdCall.args[0], 'Success at attempt 3. All 3 jobs passed.');
  t.true(travis.isDone());
});
