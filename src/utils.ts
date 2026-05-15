import * as fs from 'fs';
import * as os from 'os';
import chalk from 'chalk';
import * as path from 'path';

function die(message: string): void {
  console.error(chalk.red.bold('Error:'), message);
  process.exit(1);
}

function escapeEnvValue(value: string): string {
  let useQuote = '';

  if (value.match(/[\n '"`#]/)) {
    useQuote = '"';

    if (value.includes('"')) {
      if (!value.includes("'")) {
        useQuote = "'";
      } else if (!value.includes('`')) {
        useQuote = '`';
      }
    }
  }

  if (useQuote) {
    value = value.replaceAll('\\', '\\\\');
    value = value.replaceAll(useQuote, `\\${useQuote}`);
    value = value.replaceAll('\n', '\\n');
  }

  return `${useQuote}${value}${useQuote}`;
}

function setDotEnvOption(filename: string, key: string, value: string): void {
  value = escapeEnvValue(value);
  let lines: string[] = [];
  if (fs.existsSync(filename)) {
    const src = fs.readFileSync(filename, 'utf8').trim();

    src.replace(/\r\n?/gm, '\n');
    lines = src.split('\n');
  }

  const lineRx =
    /(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/g;

  const pos = lines.findIndex((val) => {
    const match = lineRx.exec(val);
    lineRx.lastIndex = 0; // Reset regex state because /g is used
    return match?.[1] === key;
  });

  value = value.replace(/\n/g, '\\n');

  const changedLine = `${key}=${value}`;
  if (pos == -1) {
    lines.push(changedLine);
  } else {
    lines[pos] = changedLine;
  }

  fs.writeFileSync(filename, lines.join(os.EOL).trim() + os.EOL);
}

function setDefaultDotEnvOption(key: string, value: string): void {
  const filename = path.join(process.cwd(), '.env');
  setDotEnvOption(filename, key, value);
}

export { die, setDotEnvOption, setDefaultDotEnvOption };
