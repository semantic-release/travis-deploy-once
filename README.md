# travis-deploy-once

You want to test as many node versions as possible and deploy if all of them pass.
This module allows you do just that in a script running in Travis' after_success hook.

```bash
npm install --save travis-deploy-once
```

```js
const deployOnce = require('travis-deploy-once')

try {
  var result = await deployOnce({
    token: 'asd' // GitHub oAuth token, defaults to process.env.GH_TOKEN
  })
} catch (err) {
  // something went wrong, and err will tell you what
}

if (result === true) deployMyThing()
if (result === false) console.log('Some job(s) failed')
if (result === null) console.log('Did not run inside the first job of the build matrix')
```
