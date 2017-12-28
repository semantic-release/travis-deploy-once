import test from 'ava';
import nock from 'nock';
import getToken from '../lib/get-token';
import {authenticate, unauthorized} from './helpers/mock-travis';

// Save the current process.env
const envBackup = Object.assign({}, process.env);

test.beforeEach(() => {
  process.env = {TRAVIS_REPO_SLUG: 'test_user/test_repo'};
});

test.afterEach.always(() => {
  // Restore process.env
  process.env = envBackup;
  nock.cleanAll();
});

test.serial('Authenticate with Travis', async t => {
  const githubToken = 'GITHUB_TOKEN';
  const travisOpts = {pro: false};
  const travis = authenticate({travisOpts, travisToken: 'test_token', githubToken});
  const token = await getToken(travisOpts, githubToken);

  t.is(token, 'test_token');
  t.true(travis.isDone());
});

test.serial('Authenticate with Travis (using GITHUB_TOKEN variable)', async t => {
  const githubToken = 'GITHUB_TOKEN';
  const travisOpts = {pro: false};
  const travis = authenticate({travisOpts, travisToken: 'test_token', githubToken});
  const token = await getToken(travisOpts, githubToken);

  t.is(token, 'test_token');
  t.true(travis.isDone());
});

test.serial('Authenticate with Travis (non Pro by default)', async t => {
  const githubToken = 'GITHUB_TOKEN';
  const travisOpts = undefined;
  const travis = authenticate({travisOpts, travisToken: 'test_token', githubToken});
  const token = await getToken(travisOpts, githubToken);

  t.is(token, 'test_token');
  t.true(travis.isDone());
});

test.serial('Authenticate with Travis Pro', async t => {
  const githubToken = 'GITHUB_TOKEN';
  const travisOpts = {pro: true};
  const travis = authenticate({travisOpts, travisToken: 'test_token', githubToken});
  const token = await getToken(travisOpts, githubToken);

  t.is(token, 'test_token');
  t.true(travis.isDone());
});

test.serial('Authenticate with Travis Enterprise', async t => {
  const githubToken = 'GITHUB_TOKEN';
  const travisOpts = {pro: true, enterprise: 'https://travis.example.com/api'};
  const travis = authenticate({travisOpts, travisToken: 'test_token', githubToken});
  const token = await getToken(travisOpts, githubToken);

  t.is(token, 'test_token');
  t.true(travis.isDone());
});

test.serial('Throws and Error if "githubToken" is un-authorized on Travis', async t => {
  const githubToken = 'GITHUB_TOKEN';
  const travis = unauthorized();
  const error = await t.throws(getToken({pro: false}, githubToken));

  t.is(error.name, 'HTTPError');
  t.is(error.statusCode, 401);
  t.true(travis.isDone());
});
