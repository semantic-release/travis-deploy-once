#!/usr/bin/env node

/* eslint-disable import/no-unassigned-import */
require('babel-register')({only: /travis-deploy-once\/(lib|cli.js)/});
require('babel-polyfill');

require('../cli')().catch(() => {
  process.exitCode = 1;
});
