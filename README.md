# travis-deploy-once

[![npm](https://img.shields.io/npm/v/travis-deploy-once.svg)](https://www.npmjs.com/package/travis-deploy-once)
[![Greenkeeper badge](https://badges.greenkeeper.io/semantic-release/travis-deploy-once.svg)](https://greenkeeper.io/)
[![license](https://img.shields.io/github/license/semantic-release/travis-deploy-once.svg)](https://github.com/semantic-release/travis-deploy-once/blob/master/LICENSE)
[![styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

[![Travis](https://img.shields.io/travis/semantic-release/travis-deploy-once.svg)](https://travis-ci.org/semantic-release/travis-deploy-once)
[![Codecov](https://img.shields.io/codecov/c/github/semantic-release/travis-deploy-once.svg)](https://codecov.io/gh/semantic-release/travis-deploy-once)

You want to test as many node versions as possible and deploy if all of them pass.
This module allows you do just that in a script running in Travis' after_success hook.

Only the job with the highest node version (i.e. the build leader) will run your script.

```bash
npm install --save travis-deploy-once
```

```js
const deployOnce = require('travis-deploy-once')

try {
  // Options can also be set as environment variables with the same name
  const result = await deployOnce(
    {
      // Object passed to https://github.com/pwmckenna/node-travis-ci
      travisOpts: {pro: true},
      // GitHub oAuth token
      GH_TOKEN: 'asd',
      // Want to control which job is the build leader?
      // Set your preferred job id
      BUILD_LEADER_ID: 1,
    }
  );
} catch (err) {
  // something went wrong, and err will tell you what
}

if (result === true) deployMyThing()
if (result === false) console.log('Some job(s) failed')
if (result === null) console.log('Did not run as the build leader')
```
