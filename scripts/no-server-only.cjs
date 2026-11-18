/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS preload loaded with node --require */
// Preload for CLI scripts that use server code (`npm run renewals`): `server-only`
// is provided by Next at build time and isn't installed as a package, so resolve
// it to an empty module here, the same way vitest.config.ts aliases it for tests.
const Module = require("node:module");

const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request === "server-only") return require.resolve("./stubs/server-only.cjs");
  return resolve.call(this, request, ...rest);
};
