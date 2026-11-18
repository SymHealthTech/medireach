/**
 * Test setup. Point mongodb-memory-server at the locally installed mongod
 * binary so the suite never has to download the ~600 MB server bundle. If a
 * different machine doesn't have MongoDB installed, mongodb-memory-server falls
 * back to its normal download behavior.
 */
import { existsSync } from "node:fs";
import { MongoMemoryServer } from "mongodb-memory-server";

type MongoMemoryServerOpts = NonNullable<Parameters<typeof MongoMemoryServer.create>[0]>;

const candidates = [
  "C:/Program Files/MongoDB/Server/8.0/bin/mongod.exe",
  "C:/Program Files/MongoDB/Server/7.0/bin/mongod.exe",
  "/usr/bin/mongod",
  "/opt/homebrew/bin/mongod",
];

if (!process.env.MONGOMS_SYSTEM_BINARY) {
  const found = candidates.find((p) => existsSync(p));
  if (found) process.env.MONGOMS_SYSTEM_BINARY = found;
}

// Several test files start their own mongod in parallel; on a busy machine the
// default 10 s launch timeout is too short. (No env variable exists for this.)
const create = MongoMemoryServer.create.bind(MongoMemoryServer);
MongoMemoryServer.create = ((opts: MongoMemoryServerOpts = {}) =>
  create({ ...opts, instance: { launchTimeout: 60_000, ...opts.instance } })) as typeof MongoMemoryServer.create;
