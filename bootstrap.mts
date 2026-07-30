#!/usr/bin/env node
// Package the Claude Code config bundle into boot/claude-config.zip.
//
//   npm run bootstrap
//
// At assignment kickoff, unzip it into the assignment directory:
//
//   unzip ~/SynologyDrive/Projects/assignment-prep/boot/claude-config.zip
//
// The zip is written with a hand-rolled writer over node:zlib rather than a
// dependency, so `npm install` is never needed and this works on any OS.

import { deflateRawSync } from 'node:zlib';
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT: string = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(ROOT, 'boot');
const OUT_FILE = join(OUT_DIR, 'claude-config.zip');

// The bundle is exactly what is listed here. An include list rather than an
// exclude list so a new root-level file — README.md, notes, scratch — is never
// shipped into an employer's repo just because nobody remembered to filter it.
// Directories are walked recursively; files are taken as-is. Top-level names
// only: a nested path would need separator handling for the zip entry name.
const INCLUDE: string[] = ['.claude', '.mcp.json'];

type Entry = { name: string; data: Buffer };

// --- zip plumbing ------------------------------------------------------------

const CRC_TABLE: number[] = (() => {
  const table: number[] = [];
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// Zip stores timestamps in DOS format: 7-bit year offset from 1980, and
// seconds at 2-second resolution.
function dosTime(d: Date): { time: number; date: number } {
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
    date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

function buildZip(entries: Entry[]): Buffer {
  const { time, date } = dosTime(new Date());
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8');
    const crc = crc32(entry.data);
    const deflated = deflateRawSync(entry.data);
    // Tiny files can deflate larger than they started; store those verbatim.
    const stored = deflated.length >= entry.data.length;
    const body = stored ? entry.data : deflated;
    const method = stored ? 0 : 8;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); // local file header signature
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0, 6); // flags
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(entry.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28); // extra field length
    locals.push(local, name, body);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); // central directory signature
    central.writeUInt16LE(20, 4); // version made by
    central.writeUInt16LE(20, 6); // version needed
    central.writeUInt16LE(0, 8); // flags
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(date, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(entry.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30); // extra
    central.writeUInt16LE(0, 32); // comment
    central.writeUInt16LE(0, 34); // disk number start
    central.writeUInt16LE(0, 36); // internal attrs
    // External attrs: regular file, mode 0644. `>>> 0` because JS bitwise ops
    // are signed 32-bit and this shift would otherwise go negative.
    central.writeUInt32LE((0o100644 << 16) >>> 0, 38);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);

    offset += local.length + name.length + body.length;
  }

  const localPart = Buffer.concat(locals);
  const centralPart = Buffer.concat(centrals);

  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); // end of central directory signature
  end.writeUInt16LE(0, 4); // this disk
  end.writeUInt16LE(0, 6); // disk with central dir
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralPart.length, 12); // central directory size
  end.writeUInt32LE(localPart.length, 16); // central directory offset
  end.writeUInt16LE(0, 20); // comment length

  return Buffer.concat([localPart, centralPart, end]);
}

// --- collecting the bundle ---------------------------------------------------

// A bundle that is still being filled in is the normal case, so anything absent
// is reported and skipped rather than aborting the build.
const skipped: string[] = [];

function isMissing(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === 'ENOENT';
}

function note(path: string): void {
  skipped.push(relative(ROOT, path).split(sep).join('/'));
}

function readIfPresent(path: string): Buffer | null {
  try {
    return readFileSync(path);
  } catch (err) {
    if (!isMissing(err)) throw err;
    note(path);
    return null;
  }
}

function listIfPresent(dir: string) {
  try {
    return readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    if (!isMissing(err)) throw err;
    note(dir);
    return [];
  }
}

function addFile(path: string, entries: Entry[]): void {
  // Deleted between the readdir and the read; skip rather than crash.
  const data = readIfPresent(path);
  if (data === null) return;
  // Zip paths always use forward slashes, regardless of host OS.
  const rel = relative(ROOT, path).split(sep).join('/');
  entries.push({ name: rel, data });
}

function collect(dir: string, entries: Entry[]): void {
  const dirents = listIfPresent(dir).sort((a, b) => a.name.localeCompare(b.name));
  for (const dirent of dirents) {
    const path = join(dir, dirent.name);
    if (dirent.isDirectory()) collect(path, entries);
    else addFile(path, entries);
  }
}

// One INCLUDE entry, which may name either a directory or a single file.
function add(path: string, entries: Entry[]): void {
  let isDir: boolean;
  try {
    isDir = statSync(path).isDirectory();
  } catch (err) {
    if (!isMissing(err)) throw err;
    note(path);
    return;
  }
  if (isDir) collect(path, entries);
  else addFile(path, entries);
}

const entries: Entry[] = [];
for (const name of INCLUDE) add(join(ROOT, name), entries);

const zip = buildZip(entries);
mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_FILE, zip);

for (const entry of entries) console.log(`  ${entry.name}`);
if (skipped.length > 0) {
  console.log('\nnot found, skipped:');
  for (const path of skipped) console.log(`  ${path}`);
}
console.log(
  `\n${entries.length} files -> ${relative(ROOT, OUT_FILE)} (${(zip.length / 1024).toFixed(1)} KB)`,
);
if (entries.length === 0) console.log('warning: the bundle is empty');
console.log('\nunzip it in the assignment directory at kickoff:');
console.log(`  unzip ${OUT_FILE}`);
