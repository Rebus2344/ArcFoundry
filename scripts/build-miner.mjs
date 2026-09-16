import fs from 'node:fs';
import wabtFactory from 'wabt';
import { cpuWAT, gpuShader } from './miner-kernel.mjs';
const wabt = await wabtFactory(),
  wat = cpuWAT(),
  module = wabt.parseWat('keccak-batch.wat', wat);
module.resolveNames();
module.validate();
const {
  buffer
} = module.toBinary({
  canonicalize_lebs: true,
  write_debug_names: false
});
module.destroy();
fs.mkdirSync('web/src/generated', {
  recursive: true
});
fs.writeFileSync('web/src/generated/keccak-batch.wasm', buffer);
fs.writeFileSync('web/src/keccak.wgsl', gpuShader());
console.log(`Built Keccak batch kernels: ${buffer.length} bytes WASM; fixed-register WGSL.`);
