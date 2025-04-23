#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const outDir = path.resolve(__dirname, "..", "dist/cjs");
fs.mkdirSync(outDir, { recursive: true });

const pkg = { type: "commonjs" };
fs.writeFileSync(path.join(outDir, "package.json"), JSON.stringify(pkg, null, 2) + "\n");
