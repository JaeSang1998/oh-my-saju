#!/usr/bin/env node

/** Portable stdin/file CLI adapter for agent hosts. */
import { Buffer } from 'node:buffer';
import { readFile } from 'node:fs/promises';
import process from 'node:process';
import { stdin, stdout } from 'node:process';
import { executeOhMySaju } from './execute';

const HELP = `Oh My Saju portable runtime

Usage:
  node oh-my-saju.mjs [--input command.json] [--pretty]
  node oh-my-saju.mjs --help

The runtime reads one JSON command from --input or stdin and writes one JSON
response to stdout. Supported commands are prepare-reading and validate-reading.
`;

interface CliOptions {
  readonly inputPath?: string;
  readonly pretty: boolean;
  readonly help: boolean;
}

function parseOptions(argv: readonly string[]): CliOptions {
  let inputPath: string | undefined;
  let pretty = false;
  let help = false;
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--help' || token === '-h') {
      help = true;
      continue;
    }
    if (token === '--pretty') {
      pretty = true;
      continue;
    }
    if (token === '--input') {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith('-')) {
        throw new Error('--input requires a file path.');
      }
      inputPath = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown option: ${token}`);
  }
  return { ...(inputPath === undefined ? {} : { inputPath }), pretty, help };
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

function cliFailure(message: string): Readonly<Record<string, unknown>> {
  return {
    schemaVersion: '1',
    ok: false,
    command: 'unknown',
    error: {
      name: 'OhMySajuCliError',
      code: 'INVALID_JSON_INPUT',
      message,
    },
  };
}

async function main(): Promise<void> {
  let options: CliOptions;
  try {
    options = parseOptions(process.argv.slice(2));
  } catch (error) {
    stdout.write(
      `${JSON.stringify(cliFailure(error instanceof Error ? error.message : 'Invalid options.'))}\n`,
    );
    process.exitCode = 2;
    return;
  }
  if (options.help) {
    stdout.write(HELP);
    return;
  }

  let command: unknown;
  try {
    const source =
      options.inputPath === undefined
        ? await readStdin()
        : await readFile(options.inputPath, { encoding: 'utf8' });
    command = JSON.parse(source) as unknown;
  } catch (error) {
    const message =
      error instanceof Error ? `Could not read JSON command: ${error.message}` : 'Invalid JSON.';
    stdout.write(`${JSON.stringify(cliFailure(message), null, options.pretty ? 2 : undefined)}\n`);
    process.exitCode = 2;
    return;
  }

  const response = await executeOhMySaju(command);
  stdout.write(`${JSON.stringify(response, null, options.pretty ? 2 : undefined)}\n`);
  if (!response.ok) process.exitCode = 1;
}

await main();
