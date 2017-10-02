import test from 'ava';
import nock from 'nock';
import getClient from '../lib/get-client';
import {authenticate, unauthorized} from './helpers/mock-travis';

test.beforeEach(t => {
  t.context.env = process.env;
  process.env.TRAVIS_REPO_SLUG = 'test_user/test_repo';
  process.env.GH_TOKEN = 'GITHUB_TOKEN';
});

test.afterEach.always(t => {
  process.env = t.context.env;
  nock.cleanAll();
});

test.serial('Authenticate with Travis', async t => {
  const travis = authenticate();
  const client = await getClient({pro: false}, process.env);

  t.truthy(client);
  t.false(client.pro);
  t.true(travis.isDone());
});

test.serial('Authenticate with Travis Pro', async t => {
  const travis = authenticate({pro: true});
  const client = await getClient({pro: true}, process.env);

  t.truthy(client);
  t.true(client.pro);
  t.true(travis.isDone());
});

test.serial('Throws and Error if GH_TOKEN is un-authorized on Travis', async t => {
  const travis = unauthorized();
  await t.throws(getClient({pro: false}, process.env));

  t.true(travis.isDone());
});
