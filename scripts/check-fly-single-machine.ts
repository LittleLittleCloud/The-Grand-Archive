#!/usr/bin/env bun

import { execFileSync } from "node:child_process";

type FlyMachine = {
  id: string;
  name?: string;
  state?: string;
  region?: string;
};

type FlyVolume = {
  id: string;
  name: string;
  state?: string;
  size_gb?: number;
  region?: string;
  attached_machine_id?: string | null;
};

function argValue(name: string, short?: string): string | undefined {
  const longIndex = process.argv.indexOf(name);
  if (longIndex >= 0) return process.argv[longIndex + 1];
  if (short) {
    const shortIndex = process.argv.indexOf(short);
    if (shortIndex >= 0) return process.argv[shortIndex + 1];
  }
  return undefined;
}

function findFlyCommand(): string {
  for (const candidate of ["flyctl", "fly"]) {
    try {
      execFileSync(candidate, ["version"], { stdio: "ignore" });
      return candidate;
    } catch {
      // Try the next command name.
    }
  }
  throw new Error("flyctl/fly command not found. Install flyctl before deploying.");
}

function flyJson<T>(fly: string, args: string[]): T {
  const output = execFileSync(fly, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return JSON.parse(output) as T;
}

function fail(message: string): never {
  console.error(`❌ ${message}`);
  process.exit(1);
}

const app = argValue("--app", "-a") ?? process.env.FLY_APP ?? "dak-server";
const volumeName =
  argValue("--volume") ?? process.env.FLY_VOLUME_NAME ?? "dak_data";
const expectedMachineId =
  argValue("--machine") ?? process.env.PRIMARY_MACHINE_ID;

console.log(`Checking Fly.io single-writer topology for app "${app}"...`);

const fly = findFlyCommand();
const machines = flyJson<FlyMachine[]>(fly, [
  "machines",
  "list",
  "-a",
  app,
  "--json",
]);
const volumes = flyJson<FlyVolume[]>(fly, [
  "volumes",
  "list",
  "-a",
  app,
  "--json",
]);

if (machines.length !== 1) {
  const summary = machines
    .map((m) => `${m.id}(${m.state ?? "unknown"})`)
    .join(", ");
  fail(
    `Expected exactly 1 machine for ${app}, found ${machines.length}: ${summary || "none"}`,
  );
}

const [machine] = machines;
if (!machine?.id) fail("The only Fly machine is missing an id.");

if (expectedMachineId && machine.id !== expectedMachineId) {
  fail(
    `Expected primary machine ${expectedMachineId}, but the only machine is ${machine.id}.`,
  );
}

if (volumes.length !== 1) {
  const summary = volumes
    .map((v) => `${v.id}:${v.name}->${v.attached_machine_id ?? "unattached"}`)
    .join(", ");
  fail(
    `Expected exactly 1 volume for ${app}, found ${volumes.length}: ${summary || "none"}`,
  );
}

const [volume] = volumes;
if (!volume?.id) fail("The only Fly volume is missing an id.");

if (volume.name !== volumeName) {
  fail(`Expected volume name "${volumeName}", found "${volume.name}".`);
}

if (volume.attached_machine_id !== machine.id) {
  fail(
    `Volume ${volume.id} is attached to ${volume.attached_machine_id ?? "nothing"}, not machine ${machine.id}.`,
  );
}

console.log(
  `✅ Safe to deploy: one machine ${machine.id} (${machine.state ?? "unknown"}) with one attached volume ${volume.id} (${volume.name}, ${volume.size_gb ?? "?"}GB).`,
);