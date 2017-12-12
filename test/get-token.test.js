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
  process.env.GH_TOKEN = 'GITHUB_TOKEN';
  const travisOpts = {pro: false};
  const travis = authenticate({travisOpts, travisToken: 'test_token'});
  const token = await getToken(travisOpts, process.env);

  t.is(token, 'test_token');
  t.true(travis.isDone());
});

test.serial('Authenticate with Travis (using GITHUB_TOKEN variable)', async t => {
  process.env.GITHUB_TOKEN = 'GITHUB_TOKEN';
  const travisOpts = {pro: false};
  const travis = authenticate({travisOpts, travisToken: 'test_token', githubToken: process.env.GITHUB_TOKEN});
  const token = await getToken(travisOpts, process.env);

  t.is(token, 'test_token');
  t.true(travis.isDone());
});

test.serial('Authenticate with Travis (non Pro by default)', async t => {
  process.env.GH_TOKEN = 'GITHUB_TOKEN';
  const travisOpts = undefined;
  const travis = authenticate({travisOpts, travisToken: 'test_token'});
  const token = await getToken(travisOpts, process.env);

  t.is(token, 'test_token');
  t.true(travis.isDone());
});

test.serial('Authenticate with Travis Pro', async t => {
  process.env.GH_TOKEN = 'GITHUB_TOKEN';
  const travisOpts = {pro: true};
  const travis = authenticate({travisOpts, travisToken: 'test_token'});
  const token = await getToken(travisOpts, process.env);

  t.is(token, 'test_token');
  t.true(travis.isDone());
});

test.serial('Authenticate with Travis Enterprise', async t => {
  process.env.GH_TOKEN = 'GITHUB_TOKEN';
  const travisOpts = {pro: true, enterprise: 'https://travis.example.com/api'};
  const travis = authenticate({travisOpts, travisToken: 'test_token'});
  const token = await getToken(travisOpts, process.env);

  t.is(token, 'test_token');
  t.true(travis.isDone());
});

test.serial('Throws and Error if GH_TOKEN is un-authorized on Travis', async t => {
  process.env.GH_TOKEN = 'GITHUB_TOKEN';
  const travis = unauthorized();
  const error = await t.throws(getToken({pro: false}, process.env));

  t.is(error.name, 'HTTPError');
  t.is(error.statusCode, 401);
  t.true(travis.isDone());
});
