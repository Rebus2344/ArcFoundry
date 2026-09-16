import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpuThreadLimit, describeGPU, MiningGPU } from '../web/src/hardware.mjs';
test('CPU limit preserves all browser-reported logical processors, including more than eight', () => {
  for (const count of [1, 2, 8, 16, 32, 64, 192]) assert.equal(cpuThreadLimit(count), count);
  for (const invalid of [0, -1, NaN, Infinity, '16', null]) assert.equal(cpuThreadLimit(invalid), 1);
});
test('GPU preview and first run use the same adapter; the next run gets a fresh one', async () => {
  let requests = 0;
  const adapters = [{
    info: {
      vendor: 'nvidia'
    }
  }, {
    info: {
      vendor: 'amd'
    }
  }];
  const hardware = new MiningGPU({
    requestAdapter: async options => {
      assert.equal(options.powerPreference, 'high-performance');
      return adapters[requests++];
    }
  });
  const [a, b] = await Promise.all([hardware.inspect(), hardware.inspect()]);
  assert.equal(requests, 1);
  assert.equal(a, b);
  assert.equal((await hardware.take()).adapter, a.adapter);
  assert.equal(requests, 1);
  const next = await hardware.take();
  assert.equal(next.adapter, adapters[1]);
  assert.equal(next.info.name, 'AMD Graphics');
  assert.equal(requests, 2);
});
test('GPU labels show the reported brand without a model, architecture or extra explanation', async () => {
  assert.equal((await describeGPU({
    info: {
      description: 'NVIDIA GeForce RTX 3060'
    }
  })).name, 'NVIDIA Graphics');
  const hidden = await describeGPU({
    info: {
      vendor: 'nvidia',
      architecture: 'lovelace'
    }
  });
  assert.equal(hidden.name, 'NVIDIA Graphics');
  assert.equal(hidden.detail, '');
  for (const [vendor, name] of [['amd', 'AMD'], ['intel', 'Intel'], ['apple', 'Apple'], ['qualcomm', 'Qualcomm'], ['arm', 'ARM']]) assert.equal((await describeGPU({
    info: {
      vendor
    }
  })).name, `${name} Graphics`);
  const blank = await describeGPU({
    info: {}
  });
  assert.equal(blank.name, 'GPU');
  assert.equal(blank.detail, '');
  assert.equal((await describeGPU({
    info: {
      vendor: 'unknown',
      architecture: 'lovelace'
    }
  })).name, 'GPU');
  assert.equal((await describeGPU({
    requestAdapterInfo: async () => ({
      description: 'Intel UHD Graphics'
    })
  })).name, 'Intel Graphics');
  assert.equal((await describeGPU({
    requestAdapterInfo: async () => {
      throw Error('Hidden');
    }
  })).name, 'GPU');
  const software = await describeGPU({
    info: {
      vendor: 'nvidia',
      isFallbackAdapter: true
    }
  });
  assert.equal(software.name, 'Software renderer');
  assert.equal(software.software, true);
  assert.match(software.detail, /did not select a physical GPU/);
});
test('adapter failures can be retried without a stuck rejected preview', async () => {
  let tries = 0;
  const hardware = new MiningGPU({
    requestAdapter: async () => ++tries === 1 ? null : {
      info: {
        vendor: 'nvidia'
      }
    }
  });
  await assert.rejects(hardware.inspect(), /No WebGPU adapter/);
  assert.equal((await hardware.inspect()).info.name, 'NVIDIA Graphics');
  await assert.rejects(new MiningGPU({}).inspect(), /WebGPU is unavailable/);
});
