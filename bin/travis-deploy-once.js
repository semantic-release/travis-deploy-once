#!/usr/bin/env node

/* eslint-disable import/no-unassigned-import */
require('../babel-register');

require('../cli')().catch(() => {
  process.exitCode = 1;
});
