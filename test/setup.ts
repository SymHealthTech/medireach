/**
 * Test setup. Point mongodb-memory-server at the locally installed mongod
 * binary so the suite never has to download the ~600 MB server bundle. If a
 * different machine doesn't have MongoDB installed, mongodb-memory-server falls
 * back to its normal download behavior.
 */
import { existsSync } from "node:fs";

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
