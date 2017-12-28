import test from 'ava';
import nock from 'nock';
import proxyquire from 'proxyquire';
import {stub} from 'sinon';
import getLogger from '../lib/get-logger';
import {authenticate, api} from './helpers/mock-travis';

/* eslint camelcase: ["error", {properties: "never"}] */

// Save the current process.env
const envBackup = Object.assign({}, process.env);

test.beforeEach(t => {
  process.env.TRAVIS = 'true';
  process.env.TRAVIS_REPO_SLUG = 'test_user/test_repo';
  process.env.GH_TOKEN = 'GITHUB_TOKEN';
  delete process.env.GITHUB_TOKEN;
  process.env.TRAVIS_TEST_RESULT = '0';
  delete process.env.TRAVIS_BUILD_ID;
  delete process.env.TRAVIS_JOB_ID;
  delete process.env.TRAVIS_JOB_NUMBER;
  delete process.env.BUILD_LEADER_ID;

  const logger = getLogger();
  t.context.log = stub(logger, 'log');
  t.context.error = stub(logger, 'error');
  t.context.travisDeployOnce = proxyquire('..', {
    './lib/travis-deploy-once': proxyquire('../lib/travis-deploy-once', {
      './get-logger': () => logger,
    }),
  });
});

test.afterEach.always(() => {
  // Restore process.env
  process.env = envBackup;
  nock.cleanAll();
});

test.serial('Return true if there is only one job', async t => {
  process.env.TRAVIS_BUILD_ID = 123;
  process.env.TRAVIS_JOB_ID = 456;
  process.env.TRAVIS_JOB_NUMBER = '1.1';
  const jobs = [{id: process.env.TRAVIS_JOB_ID, number: '1.1', state: 'started', config: {node_js: 8}}];
  const auth = authenticate();
  const travis = api()
    .get(`/builds/${process.env.TRAVIS_BUILD_ID}`)
    .reply(200, {jobs});

  t.true(await t.context.travisDeployOnce());
  t.true(auth.isDone());
  t.true(travis.isDone());
  t.is(t.context.log.args[0][0], 'There is only one job for this build.');
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
  const auth = authenticate();
  const travis = api()
    .get(`/builds/${process.env.TRAVIS_BUILD_ID}`)
    .reply(200, {jobs: jobsFirst})
    .get(`/builds/${process.env.TRAVIS_BUILD_ID}`)
    .reply(200, {jobs: jobsSecond});

  t.true(await t.context.travisDeployOnce());
  t.true(auth.isDone());
  t.true(travis.isDone());
  t.is(t.context.log.args[2][0], 'Aborting attempt 1, because of pending job(s): 1.2.');
  t.is(t.context.log.args[3][0], 'Success at attempt 2. All 2 jobs passed.');
  t.is(t.context.log.args[4][0], 'All jobs are successful for this build!');
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
  const auth = authenticate();
  const travis = api()
    .get(`/builds/${process.env.TRAVIS_BUILD_ID}`)
    .reply(200, {jobs: jobsFirst})
    .get(`/builds/${process.env.TRAVIS_BUILD_ID}`)
    .reply(200, {jobs: jobsSecond});

  t.true(await t.context.travisDeployOnce());
  t.true(auth.isDone());
  t.true(travis.isDone());
  t.is(t.context.log.args[3][0], 'Success at attempt 2. All 3 jobs passed.');
  t.is(t.context.log.args[4][0], 'All jobs are successful for this build!');
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
  const auth = authenticate();
  const travis = api()
    .get(`/builds/${process.env.TRAVIS_BUILD_ID}`)
    .reply(200, {jobs: jobsFirst})
    .get(`/builds/${process.env.TRAVIS_BUILD_ID}`)
    .reply(200, {jobs: jobsSecond});

  t.false(await t.context.travisDeployOnce());
  t.true(auth.isDone());
  t.true(travis.isDone());
  t.is(t.context.log.args[2][0], 'Aborting attempt 1, because of pending job(s): 1.2.');
  t.is(t.context.error.args[0][0], 'Aborting at attempt 2. Job 1.2 failed.');
  t.is(t.context.error.args[1][0], 'At least one job has failed for this build.');
});

test('Return false if test of current jobs have failed', async t => {
  process.env.TRAVIS_TEST_RESULT = '1';
  t.false(await t.context.travisDeployOnce());
  t.is(t.context.error.args[0][0], 'The current job test phase has failed.');
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
  const auth = authenticate();
  const travis = api()
    .get(`/builds/${process.env.TRAVIS_BUILD_ID}`)
    .reply(200, {jobs: jobsFirst});

  t.is(await t.context.travisDeployOnce(), null);
  t.true(auth.isDone());
  t.true(travis.isDone());
  t.is(t.context.log.args[2][0], 'The current job (1.1) is not the build leader.');
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
    const auth = authenticate();
    const travis = api()
      .get(`/builds/${process.env.TRAVIS_BUILD_ID}`)
      .reply(200, {jobs: jobsFirst})
      .get(`/builds/${process.env.TRAVIS_BUILD_ID}`)
      .reply(200, {jobs: jobsSecond});

    t.true(await t.context.travisDeployOnce());
    t.true(auth.isDone());
    t.true(travis.isDone());
    t.is(t.context.log.args[1][0], 'Success at attempt 2. All 2 jobs passed.');
    t.is(t.context.log.args[2][0], 'All jobs are successful for this build!');
  }
);

test.serial('Allow to pass "buildLeaderId" as parameter', async t => {
  const jobId = 456;
  process.env.TRAVIS_BUILD_ID = 123;
  process.env.TRAVIS_JOB_ID = jobId;
  process.env.TRAVIS_JOB_NUMBER = '1.1';
  const jobsFirst = [
    {id: jobId, number: '1.1', state: 'started', config: {node_js: 6}},
    {id: 789, number: '1.2', state: 'passed', config: {node_js: 8}},
  ];
  const auth = authenticate();
  const travis = api()
    .get(`/builds/${process.env.TRAVIS_BUILD_ID}`)
    .reply(200, {jobs: jobsFirst});

  t.true(await t.context.travisDeployOnce({buildLeaderId: 1}));
  t.true(auth.isDone());
  t.true(travis.isDone());
  t.is(t.context.log.args[0][0], 'Success at attempt 1. All 2 jobs passed.');
  t.is(t.context.log.args[1][0], 'All jobs are successful for this build!');
});

test.serial('Allow to pass githubToken as parameter', async t => {
  const githubToken = 'TEST_TOKEN';
  const jobId = 456;
  process.env.TRAVIS_BUILD_ID = 123;
  process.env.TRAVIS_JOB_ID = jobId;
  process.env.TRAVIS_JOB_NUMBER = '1.1';
  const jobsFirst = [
    {id: jobId, number: '1.1', state: 'started', config: {node_js: 8}},
    {id: 789, number: '1.2', state: 'passed', config: {node_js: 6}},
  ];
  const auth = authenticate({githubToken});
  const travis = api()
    .get(`/builds/${process.env.TRAVIS_BUILD_ID}`)
    .reply(200, {jobs: jobsFirst});

  t.true(await t.context.travisDeployOnce({githubToken}));
  t.true(auth.isDone());
  t.true(travis.isDone());
  t.is(t.context.log.args[2][0], 'Success at attempt 1. All 2 jobs passed.');
  t.is(t.context.log.args[3][0], 'All jobs are successful for this build!');
});

test.serial('Choose last occurence of the highest version as leader', async t => {
  const jobId = 456;
  process.env.TRAVIS_BUILD_ID = 123;
  process.env.TRAVIS_JOB_ID = jobId;
  process.env.TRAVIS_JOB_NUMBER = '1.1';
  const jobsFirst = [
    {id: 789, number: '1.1', state: 'started', config: {node_js: 8}},
    {id: jobId, number: '1.2', state: 'started', config: {node_js: 8}},
  ];
  const auth = authenticate();
  const travis = api()
    .get(`/builds/${process.env.TRAVIS_BUILD_ID}`)
    .reply(200, {jobs: jobsFirst});

  t.is(await t.context.travisDeployOnce(), null);
  t.true(auth.isDone());
  t.true(travis.isDone());
  t.is(t.context.log.args[2][0], 'The current job (1.1) is not the build leader.');
});

test.serial('Return null if none of the job define a Node version', async t => {
  const jobId = 456;
  process.env.TRAVIS_BUILD_ID = 123;
  process.env.TRAVIS_JOB_ID = jobId;
  process.env.TRAVIS_JOB_NUMBER = '1.2';
  const jobsFirst = [
    {id: 111, number: '1.1', state: 'started', config: {java: 8}},
    {id: jobId, number: '1.2', state: 'started', config: {java: 7}},
    {id: 789, number: '1.3', state: 'passed', config: {java: 6}},
  ];
  const auth = authenticate();
  const travis = api()
    .get(`/builds/${process.env.TRAVIS_BUILD_ID}`)
    .reply(200, {jobs: jobsFirst});

  t.is(await t.context.travisDeployOnce(), null);
  t.true(auth.isDone());
  t.true(travis.isDone());
  t.is(
    t.context.log.args[0][0],
    'There is no job in this build defining a node version, please set BUILD_LEADER_ID to define the build leader yourself.'
  );
});

test.serial(
  'Return true if the current job is BUILD_LEADER_ID even if none of the job define a Node version',
  async t => {
    const jobId = 456;
    process.env.BUILD_LEADER_ID = 2;
    process.env.TRAVIS_BUILD_ID = 123;
    process.env.TRAVIS_JOB_ID = jobId;
    process.env.TRAVIS_JOB_NUMBER = '1.2';
    const jobsFirst = [
      {id: jobId, number: '1.1', state: 'started', config: {java: 6}},
      {id: 789, number: '1.2', state: 'started', config: {java: 8}},
    ];
    const jobsSecond = [
      {id: jobId, number: '1.1', state: 'started', config: {java: 6}},
      {id: 789, number: '1.2', state: 'passed', config: {java: 8}},
    ];
    const auth = authenticate();
    const travis = api()
      .get(`/builds/${process.env.TRAVIS_BUILD_ID}`)
      .reply(200, {jobs: jobsFirst})
      .get(`/builds/${process.env.TRAVIS_BUILD_ID}`)
      .reply(200, {jobs: jobsSecond});

    t.true(await t.context.travisDeployOnce());
    t.true(auth.isDone());
    t.true(travis.isDone());
    t.is(t.context.log.args[1][0], 'Success at attempt 2. All 2 jobs passed.');
    t.is(t.context.log.args[2][0], 'All jobs are successful for this build!');
  }
);
