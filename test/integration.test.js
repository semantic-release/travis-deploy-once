import test from 'ava';
import nock from 'nock';
import proxyquire from 'proxyquire';
import {stub} from 'sinon';
import getLogger from '../lib/get-logger';
import {authenticate} from './helpers/mock-travis';

/* eslint camelcase: ["error", {properties: "never"}] */

test.beforeEach(t => {
  t.context.env = process.env;
  process.env.TRAVIS = 'true';
  process.env.TRAVIS_REPO_SLUG = 'test_user/test_repo';
  process.env.GH_TOKEN = 'GITHUB_TOKEN';
  process.env.TRAVIS_TEST_RESULT = '0';

  const logger = getLogger();
  t.context.log = stub(logger, 'log');
  t.context.error = stub(logger, 'error');
  t.context.travisDeployOnce = proxyquire('../index', {
    './lib/travis-deploy-once': proxyquire('../lib/travis-deploy-once', {
      './get-logger': () => logger,
    }),
  });
});

test.afterEach.always(t => {
  process.env = t.context.env;
  nock.cleanAll();
});

test.serial('Return true if there is only one job', async t => {
  process.env.TRAVIS_BUILD_ID = 123;
  process.env.TRAVIS_JOB_ID = 456;
  process.env.TRAVIS_JOB_NUMBER = '1.1';
  const jobs = [{id: process.env.TRAVIS_JOB_ID, number: '1.1', state: 'started', config: {node_js: 8}}];
  const travis = authenticate();

  travis.get(`/builds/${process.env.TRAVIS_BUILD_ID}`).reply(200, {jobs});

  t.true(await t.context.travisDeployOnce());
  t.true(travis.isDone());
  t.is(t.context.log.lastCall.args[0], 'There is only one job for this build.');
});

test.serial('Return true if the current job is the build leader and all other job passes', async t => {
  const jobId = 456;
  process.env.TRAVIS_BUILD_ID = 123;
  process.env.TRAVIS_JOB_ID = jobId;
  process.env.TRAVIS_JOB_NUMBER = '1.1';
  const jobsFirst = [
    {id: jobId, number: '1.1', state: 'started', config: {node_js: 8}},
    {id: 789, number: '1.2', state: 'started', config: {node_js: 6}},
  ];
  const jobsSecond = [
    {id: jobId, number: '1.1', state: 'started', config: {node_js: 8}},
    {id: 789, number: '1.2', state: 'passed', config: {node_js: 6}},
  ];
  const travis = authenticate();

  travis
    .get(`/builds/${process.env.TRAVIS_BUILD_ID}`)
    .reply(200, {jobs: jobsFirst})
    .get(`/builds/${process.env.TRAVIS_BUILD_ID}`)
    .reply(200, {jobs: jobsSecond});

  t.true(await t.context.travisDeployOnce());
  t.true(travis.isDone());
  t.true(t.context.log.calledWith('Aborting attempt 1, because of pending job(s): 1.2.'));
  t.true(t.context.log.calledWith('Success at attempt 2. All 2 jobs passed.'));
  t.is(t.context.log.lastCall.args[0], 'All jobs are successful for this build!');
});

test.serial('Works with jobs that are not running on node', async t => {
  const jobId = 456;
  process.env.TRAVIS_BUILD_ID = 123;
  process.env.TRAVIS_JOB_ID = jobId;
  process.env.TRAVIS_JOB_NUMBER = '1.2';
  const jobsFirst = [
    {id: 111, number: '1.1', state: 'started', config: {java: 8}},
    {id: jobId, number: '1.2', state: 'started', config: {node_js: 8}},
    {id: 789, number: '1.3', state: 'passed', config: {node_js: 6}},
  ];
  const jobsSecond = [
    {id: 111, number: '1.1', state: 'passed', config: {java: 8}},
    {id: jobId, number: '1.2', state: 'started', config: {node_js: 8}},
    {id: 789, number: '1.3', state: 'passed', config: {node_js: 6}},
  ];
  const travis = authenticate();

  travis
    .get(`/builds/${process.env.TRAVIS_BUILD_ID}`)
    .reply(200, {jobs: jobsFirst})
    .get(`/builds/${process.env.TRAVIS_BUILD_ID}`)
    .reply(200, {jobs: jobsSecond});

  t.true(await t.context.travisDeployOnce());
  t.true(travis.isDone());
  t.true(t.context.log.calledWith('Success at attempt 2. All 3 jobs passed.'));
  t.is(t.context.log.lastCall.args[0], 'All jobs are successful for this build!');
});

test.serial('Return false if the current job is the build leader and another job fails', async t => {
  const jobId = 456;
  process.env.TRAVIS_BUILD_ID = 123;
  process.env.TRAVIS_JOB_ID = jobId;
  process.env.TRAVIS_JOB_NUMBER = '1.1';
  const jobsFirst = [
    {id: jobId, number: '1.1', state: 'started', config: {node_js: 8}},
    {id: 789, number: '1.2', state: 'started', config: {node_js: 6}},
  ];
  const jobsSecond = [
    {id: jobId, number: '1.1', state: 'started', config: {node_js: 8}},
    {id: 789, number: '1.2', state: 'errored', config: {node_js: 6}},
  ];
  const travis = authenticate();

  travis
    .get(`/builds/${process.env.TRAVIS_BUILD_ID}`)
    .reply(200, {jobs: jobsFirst})
    .get(`/builds/${process.env.TRAVIS_BUILD_ID}`)
    .reply(200, {jobs: jobsSecond});

  t.false(await t.context.travisDeployOnce());
  t.true(travis.isDone());
  t.true(t.context.log.calledWith('Aborting attempt 1, because of pending job(s): 1.2.'));
  t.true(t.context.error.calledWith('Aborting at attempt 2. Job 1.2 failed.'));
  t.is(t.context.error.lastCall.args[0], 'At least one job has failed for this build.');
});

test('Return false if test of current jobs have failed', async t => {
  process.env.TRAVIS_TEST_RESULT = '1';
  t.false(await t.context.travisDeployOnce());
  t.is(t.context.error.lastCall.args[0], 'The current job test phase has failed.');
});

test.serial('Return null if the current job is not the build leader', async t => {
  const jobId = 456;
  process.env.TRAVIS_BUILD_ID = 123;
  process.env.TRAVIS_JOB_ID = jobId;
  process.env.TRAVIS_JOB_NUMBER = '1.1';
  const jobsFirst = [
    {id: jobId, number: '1.1', state: 'started', config: {node_js: 6}},
    {id: 789, number: '1.2', state: 'started', config: {node_js: 8}},
  ];
  const travis = authenticate();

  travis.get(`/builds/${process.env.TRAVIS_BUILD_ID}`).reply(200, {jobs: jobsFirst});

  t.is(await t.context.travisDeployOnce(), null);
  t.true(travis.isDone());
  t.is(t.context.log.lastCall.args[0], 'The current job (1.1) is not the build leader.');
});

test.serial(
  'Return true if the current job is BUILD_LEADER_ID even if it does not have the highest node version',
  async t => {
    const jobId = 456;
    process.env.BUILD_LEADER_ID = 1;
    process.env.TRAVIS_BUILD_ID = 123;
    process.env.TRAVIS_JOB_ID = jobId;
    process.env.TRAVIS_JOB_NUMBER = '1.1';
    const jobsFirst = [
      {id: jobId, number: '1.1', state: 'started', config: {node_js: 6}},
      {id: 789, number: '1.2', state: 'started', config: {node_js: 8}},
    ];
    const jobsSecond = [
      {id: jobId, number: '1.1', state: 'started', config: {node_js: 6}},
      {id: 789, number: '1.2', state: 'passed', config: {node_js: 8}},
    ];
    const travis = authenticate();

    travis
      .get(`/builds/${process.env.TRAVIS_BUILD_ID}`)
      .reply(200, {jobs: jobsFirst})
      .get(`/builds/${process.env.TRAVIS_BUILD_ID}`)
      .reply(200, {jobs: jobsSecond});

    t.true(await t.context.travisDeployOnce());
    t.true(travis.isDone());
    t.true(t.context.log.calledWith('Success at attempt 2. All 2 jobs passed.'));
    t.is(t.context.log.lastCall.args[0], 'All jobs are successful for this build!');
  }
);

test.serial('Allow to pass BUILD_LEADER_ID as parameter', async t => {
  const jobId = 456;
  process.env.TRAVIS_BUILD_ID = 123;
  process.env.TRAVIS_JOB_ID = jobId;
  process.env.TRAVIS_JOB_NUMBER = '1.1';
  const jobsFirst = [
    {id: jobId, number: '1.1', state: 'started', config: {node_js: 6}},
    {id: 789, number: '1.2', state: 'passed', config: {node_js: 8}},
  ];

  const travis = authenticate();

  travis.get(`/builds/${process.env.TRAVIS_BUILD_ID}`).reply(200, {jobs: jobsFirst});

  t.true(await t.context.travisDeployOnce({BUILD_LEADER_ID: 1}));
  t.true(travis.isDone());
  t.true(t.context.log.calledWith('Success at attempt 1. All 2 jobs passed.'));
  t.is(t.context.log.lastCall.args[0], 'All jobs are successful for this build!');
});

test.serial('Allow to pass GH_TOKEN as parameter', async t => {
  const GH_TOKEN = 'TEST_TOKEN';
  const jobId = 456;
  process.env.TRAVIS_BUILD_ID = 123;
  process.env.TRAVIS_JOB_ID = jobId;
  process.env.TRAVIS_JOB_NUMBER = '1.1';
  const jobsFirst = [
    {id: jobId, number: '1.1', state: 'started', config: {node_js: 8}},
    {id: 789, number: '1.2', state: 'passed', config: {node_js: 6}},
  ];
  const travis = authenticate({GH_TOKEN});

  travis.get(`/builds/${process.env.TRAVIS_BUILD_ID}`).reply(200, {jobs: jobsFirst});

  t.true(await t.context.travisDeployOnce({GH_TOKEN}));
  t.true(travis.isDone());
  t.true(t.context.log.calledWith('Success at attempt 1. All 2 jobs passed.'));
  t.is(t.context.log.lastCall.args[0], 'All jobs are successful for this build!');
});

test.serial('Choose first occurence of the highest version as leader', async t => {
  const jobId = 456;
  process.env.TRAVIS_BUILD_ID = 123;
  process.env.TRAVIS_JOB_ID = jobId;
  process.env.TRAVIS_JOB_NUMBER = '1.2';
  const jobsFirst = [
    {id: 789, number: '1.1', state: 'started', config: {node_js: 8}},
    {id: jobId, number: '1.2', state: 'started', config: {node_js: 8}},
  ];
  const travis = authenticate();

  travis.get(`/builds/${process.env.TRAVIS_BUILD_ID}`).reply(200, {jobs: jobsFirst});

  t.is(await t.context.travisDeployOnce(), null);
  t.true(travis.isDone());
  t.is(t.context.log.lastCall.args[0], 'The current job (1.2) is not the build leader.');
});
