import * as fs from 'fs';
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
    let src = fs.readFileSync(filename, 'utf8');

    src = src.replace(/\r\n?/g, '\n');
    if (src) {
      lines = src.endsWith('\n')
        ? src.slice(0, -1).split('\n')
        : src.split('\n');
    }
  }

  const lineRx =
    /(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/;

  const pos = lines.findIndex((val) => {
    const match = lineRx.exec(val);
    return match?.[1] === key;
  });

  value = value.replace(/\n/g, '\\n');

  const changedLine = `${key}=${value}`;
  if (pos == -1) {
    lines.push(changedLine);
  } else {
    lines[pos] = changedLine;
  }

  fs.writeFileSync(filename, lines.join('\n') + '\n');
}

function setDefaultDotEnvOption(key: string, value: string): void {
  const filename = path.join(process.cwd(), '.env');
  setDotEnvOption(filename, key, value);
}

export { die, setDotEnvOption, setDefaultDotEnvOption };
