import fs from 'node:fs';
import path from 'node:path';
import solc from 'solc';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const sources = Object.fromEntries(fs.readdirSync('contracts').filter(f => f.endsWith('.sol')).map(f => [`contracts/${f}`, {
  content: fs.readFileSync(`contracts/${f}`, 'utf8')
}]));
const pending = Object.keys(sources);
for (let i = 0; i < pending.length; i++) {
  const file = pending[i];
  for (const m of sources[file].content.matchAll(/import\s+(?:[^;]*?from\s+)?["']([^"']+)["']/g)) {
    const name = m[1].startsWith('.') ? path.posix.normalize(path.posix.join(path.posix.dirname(file), m[1])) : m[1];
    if (!sources[name]) {
      sources[name] = {
        content: fs.readFileSync(name.startsWith('@') ? require.resolve(name) : name, 'utf8')
      };
      pending.push(name);
    }
  }
}
const input = {
  language: 'Solidity',
  sources,
  settings: {
    optimizer: {
      enabled: true,
      runs: 200
    },
    viaIR: true,
    evmVersion: 'cancun',
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object', 'storageLayout']
      }
    }
  }
};
const output = JSON.parse(solc.compile(JSON.stringify(input)));
for (const e of output.errors ?? []) console[e.severity === 'error' ? 'error' : 'warn'](e.formattedMessage);
if (output.errors?.some(e => e.severity === 'error')) process.exit(1);
fs.mkdirSync('artifacts', {
  recursive: true
});
fs.mkdirSync('web/public/contracts', {
  recursive: true
});
fs.writeFileSync('artifacts/standard-input.json', JSON.stringify(input));
for (const [file, cs] of Object.entries(output.contracts)) for (const [name, c] of Object.entries(cs)) {
  if (!file.startsWith('contracts/')) continue;
  const bytes = c.evm.deployedBytecode.object.length / 2;
  if (bytes > 24576) throw Error(`${name} exceeds EIP-170`);
  const a = {
    contractName: name,
    abi: c.abi,
    bytecode: '0x' + c.evm.bytecode.object,
    deployedBytecode: '0x' + c.evm.deployedBytecode.object,
    storageLayout: c.storageLayout
  };
  fs.writeFileSync(`artifacts/${name}.json`, JSON.stringify(a, null, 2));
  fs.writeFileSync(`web/public/contracts/${name}.json`, JSON.stringify({
    abi: c.abi
  }));
  console.log(`${name}: ${bytes} bytes`);
}
