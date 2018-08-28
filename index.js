#!/usr/bin/env node
/* eslint-disable import/no-unassigned-import */
require('./babel-register');

module.exports = require('./lib/travis-deploy-once');
