# travis-deploy-once

Run a deployment script only once in the [Travis](https://travis-ci.org/) test matrix.

[![Travis](https://img.shields.io/travis/semantic-release/travis-deploy-once.svg)](https://travis-ci.org/semantic-release/travis-deploy-once)
[![Codecov](https://img.shields.io/codecov/c/github/semantic-release/travis-deploy-once.svg)](https://codecov.io/gh/semantic-release/travis-deploy-once)
[![Greenkeeper badge](https://badges.greenkeeper.io/semantic-release/travis-deploy-once.svg)](https://greenkeeper.io/)

**Note**: Travis supports [Build Stages](https://docs.travis-ci.com/user/build-stages) as a beta feature. We recommend to use Build Stages instead of `travis-deploy-once` if possible. It’s a clearer and more flexible way to orchestrate jobs within a build.

For Travis builds running multiple jobs (to test with multiple [Node versions](https://docs.travis-ci.com/user/languages/javascript-with-nodejs/#Specifying-Node.js-versions) and/or [OSs](https://docs.travis-ci.com/user/multi-os)), `travis-deploy-once` run some code only once, after all other jobs have completed successfully.

`travis-deploy-once` is usually used in the `after_success` step. But if you want your build to break in case the `travis-deploy-once` script returns an error, you can set it in the `script` or `before_script` step (see [Travis Build Lifecycle](https://docs.travis-ci.com/user/customizing-the-build/#The-Build-Lifecycle)).

Your code will run only on the job identified as the build leader, which is determined as follow, by order of priority:
- The job with the ID defined in the [-b](#-b---buildleaderid), [--buildLeaderId](#-b---buildleaderid) CLI options or the [buildLeaderId](#buildleaderid) API option or `BUILD_LEADER_ID` environment variable.
- The job configured with the [latest Node version](https://docs.travis-ci.com/user/languages/javascript-with-nodejs/#Specifying-Node.js-versions) (`node_js: node`).
- The job configured with the [lts Node version](https://docs.travis-ci.com/user/languages/javascript-with-nodejs/#Specifying-Node.js-versions) (`node_js: lts/*`).
- The job with the highest node version
- The job with the highest job number if none of the jobs specify a node version (see [#42](https://github.com/semantic-release/travis-deploy-once/pull/42))

**Note**: If multiple jobs match, the one with the highest job ID (which corresponds to the last one defined in `.travis.yml`) will be identified as the build leader.

## CLI

```bash
Usage: travis-deploy-once.js [script]
```

### CLI usage with script argument

Run the `script` passed in the first argument only if the current job is the build leader and all other jobs are successful and return with the exit code of the script. Return with exit code `0` otherwise.

In `.travis.yml`:

```yaml
language: node_js
node_js:
  - 8
  - 6
  - 4
os:
  - osx
  - linux
after_success:
  - npm install -g travis-deploy-once
  - travis-deploy-once "deploy-script --script-arg script-arg-value"
```

The script `deploy-script` will be called only for the node 8 job running on `linux`. It will be passed the arguments `--script-arg script-arg-value`.

### CLI usage without script argument

Return with exit code `0` if the current job is the build leader and all other jobs are successful. Return with exit code `1` otherwise.

In `.travis.yml`:

```yaml
language: node_js
node_js:
  - 8
  - 6
  - 4
os:
  - osx
  - linux
after_success:
  - npm install -g travis-deploy-once
  - travis-deploy-once && deploy-script --script-arg script-arg-value
```

The script `deploy-script` will be called only for the node 8 job running on `linux`. It will be passed the arguments `--script-arg script-arg-value`.

### CLI options

#### -t, --githubToken

Type: `String`
Default: `GH_TOKEN` or `GITHUB_TOKEN` environment variable

GitHub OAuth token.

#### -b, --buildLeaderId

Type: `Number`
Default: `BUILD_LEADER_ID` environment variable

Define which Travis job will run the script (build leader). If not defined the build leader will be the Travis job running on the highest Node version.

#### -p, --pro

Type: `Boolean`
Default: `false`

`true` to use [Travis Pro](https://travis-ci.com), `false` to use [Travis for Open Source](https://travis-ci.org).

#### -u, --travis-url

Type: `String`
Default: `TRAVIS_URL` environment variable

[Travis Enterprise](https://enterprise.travis-ci.com) URL. If defined, the [-p, --pro](#-p---pro) option will be ignored.

**Note**: This is the URL of the API endpoint, for example `https://travis.example.com/api`.

#### -h, --help

Type: `Boolean`

Show help.

#### -v, --version

Type: `Boolean`

Show version number.

## API

### API usage

```bash
npm install --save travis-deploy-once
```

In the module `my-module`:

```js
const deployOnce = require('travis-deploy-once');

try {
  const result = await deployOnce({travisOpts: {pro: true}, githubToken: 'xxxxxx', buildLeaderId: 1});

  if (result === true) deployMyThing();
  if (result === false) console.log('Some job(s) failed');
  if (result === null) console.log('Did not run as the build leader');
} catch (err) {
  // something went wrong, and err will tell you what
}
```

In `.travis.yml`:

```yaml
language: node_js
node_js:
  - 8
  - 6
  - 4
os:
  - osx
  - linux
after_success:
  - npm run my-module
```

The script `my-module` with be called for each node version on both OSs and `deployMyThing` will be called only for the node 8 job running on `linux`.

### Function `deployOnce([options])`

Returns a `Promise` that resolves to:
- `true` if the current Travis job is the build leader, the current `script` phase is successful and all other job have completed successfully. => Your code can safely run.
- `false` if at least one Travis job failed. => Your code should not run.
- `null` if the current Travis job is **not** the build leader. => Your code should not run, and will be executed on the build leader.

Throws an `Error` if:
- It doesn't run on Travis.
- The Github authentication token is missing.
- The Github authentication token is not authorized with Travis.

#### options

Type: `Object`

##### githubToken

Type: `String`
Default: `process.env.GH_TOKEN` or `process.env.GITHUB_TOKEN`

GitHub OAuth token.

##### buildLeaderId

Type: `Number`
Default: `process.env.BUILD_LEADER_ID`

Define which Travis job will run the script (build leader). If not defined the build leader will be the Travis job running on the highest Node version.

##### travisOpts

Type: `Object`

###### pro

Type: `Boolean`
Default: `false`

`true` to use [Travis Pro](https://travis-ci.com), `false` to use [Travis for Open Source](https://travis-ci.org).

###### enterprise

Type: `String`
Default: `process.env.TRAVIS_URL`

[Travis Enterprise](https://enterprise.travis-ci.com) URL. If defined, the [pro](#pro) option will be ignored.

**Note**: This is the URL of the API endpoint, for example `https://travis.example.com/api`.
