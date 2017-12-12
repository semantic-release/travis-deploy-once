import test from 'ava';
import nock from 'nock';
import {stub} from 'sinon';
import getLogger from '../lib/get-logger';
import waitForOtherJobs from '../lib/wait-for-other-jobs';
import {api} from './helpers/mock-travis';

// Save the current process.env
const envBackup = Object.assign({}, process.env);

test.beforeEach(t => {
  process.env.TRAVIS_REPO_SLUG = 'test_user/test_repo';
  process.env.GH_TOKEN = 'GITHUB_TOKEN';
  t.context.logger = getLogger();
  t.context.log = stub(t.context.logger, 'log');
  t.context.error = stub(t.context.logger, 'error');
});

test.afterEach.always(() => {
  // Restore process.env
  process.env = envBackup;
  nock.cleanAll();
});

test.serial('Wait for jobs to complete, ignoring current one and return true', async t => {
  const travisToken = 'TRAVIS_TOKEN';
  const travisOpts = {};
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
  const travis = api()
    .get(`/builds/${buildId}`)
    .reply(200, {jobs: jobsSecond})
    .get(`/builds/${buildId}`)
    .reply(200, {jobs: jobsThird});

  t.true(
    await waitForOtherJobs(travisOpts, travisToken, buildId, currentJobId, jobsFirst, t.context.logger, {
      forever: true,
      factor: 1,
      minTimeout: 1,
    })
  );

  t.is(t.context.log.callCount, 3);
  t.is(t.context.log.args[0][0], 'Aborting attempt 1, because of pending job(s): 1.1, 1.3.');
  t.is(t.context.log.args[1][0], 'Aborting attempt 2, because of pending job(s): 1.3.');
  t.is(t.context.log.args[2][0], 'Success at attempt 3. All 3 jobs passed.');
  t.true(travis.isDone());
});

test.serial('Return false as soon as a job fails', async t => {
  const travisToken = 'TRAVIS_TOKEN';
  const travisOpts = {};
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
  const travis = api()
    .get(`/builds/${buildId}`)
    .reply(200, {jobs: jobsSecond})
    .get(`/builds/${buildId}`)
    .reply(200, {jobs: jobsThird});

  t.false(
    await waitForOtherJobs(travisOpts, travisToken, buildId, currentJobId, jobsFirst, t.context.logger, {
      forever: true,
      factor: 1,
      minTimeout: 1,
    })
  );

  t.is(t.context.log.callCount, 2);
  t.is(t.context.error.callCount, 1);
  t.is(t.context.log.args[0][0], 'Aborting attempt 1, because of pending job(s): 1.1, 1.3.');
  t.is(t.context.log.args[1][0], 'Aborting attempt 2, because of pending job(s): 1.3.');
  t.is(t.context.error.args[0][0], 'Aborting at attempt 3. Job 1.3 failed.');
  t.true(travis.isDone());
});

test.serial('Handle API errors', async t => {
  const travisToken = 'TRAVIS_TOKEN';
  const travisOpts = {};
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
  const travis = api()
    .get(`/builds/${buildId}`)
    .reply(500, 'server error')
    .get(`/builds/${buildId}`)
    .reply(200, {jobs: jobsSecond});

  t.true(
    await waitForOtherJobs(travisOpts, travisToken, buildId, currentJobId, jobsFirst, t.context.logger, {
      forever: true,
      factor: 1,
      minTimeout: 1,
    })
  );

  t.is(t.context.log.args[0][0], 'Aborting attempt 1, because of pending job(s): 1.1, 1.3.');
  t.is(
    t.context.log.args[1][0],
    'Failed attempt 2, because Travis API returned the error: HTTPError: Response code 500 (Internal Server Error).'
  );
  t.is(t.context.log.args[2][0], 'Success at attempt 3. All 3 jobs passed.');
  t.true(travis.isDone());
});
