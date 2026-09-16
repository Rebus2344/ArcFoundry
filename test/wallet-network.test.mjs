import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureWalletNetwork, walletNetwork } from '../web/src/wallet-network.mjs';
import { connectWallet, readableError } from '../web/src/chain.js';
import { assertWalletSession } from '../web/src/wallets.mjs';
import { RELEASE } from '../shared/release.mjs';
const account = '0x1111111111111111111111111111111111111111';
const target = 5042002;
test('release prepares the wallet for official mainnet before contracts are deployed', async () => {
  const w = wallet({
    unknown: true
  });
  await ensureWalletNetwork(w, RELEASE);
  const add = w.calls.find(x => x.method === 'wallet_addEthereumChain').params[0];
  assert.equal(add.chainId, '0x13b2');
  assert.deepEqual(add.rpcUrls, ['https://rpc.mainnet.arc.io']);
  assert.deepEqual(add.blockExplorerUrls, ['https://explorer.arc.io']);
  assert.equal(RELEASE.address, null);
});
function wallet({
  chain = 1,
  unknown = false,
  autoSwitch = true,
  reject = null,
  noSwitch = false
} = {}) {
  const calls = [];
  return {
    calls,
    request: async ({
      method,
      params
    }) => {
      calls.push({
        method,
        params
      });
      if (method === 'eth_chainId') return '0x' + chain.toString(16);
      if (method === 'eth_accounts' || method === 'eth_requestAccounts') return [account];
      if (method === 'wallet_switchEthereumChain') {
        if (reject) throw reject;
        if (unknown) throw {
          code: 4902
        };
        if (!noSwitch) chain = Number(params[0].chainId);
        return null;
      }
      if (method === 'wallet_addEthereumChain') {
        unknown = false;
        if (autoSwitch) chain = Number(params[0].chainId);
        return null;
      }
      throw Error('Unexpected wallet request: ' + method);
    }
  };
}
test('unpublished mainnet uses testnet for wallet preparation only', () => {
  const config = {
    chainId: 0,
    rpcUrl: '',
    address: null,
    networkName: 'Arc Mainnet'
  };
  const net = walletNetwork(config);
  assert.equal(net.chainId, target);
  assert.equal(net.rpcUrl, 'https://rpc.testnet.arc.io');
  assert.equal(config.chainId, 0);
  assert.equal(config.address, null);
  assert.throws(() => walletNetwork({
    ...config,
    address: account
  }), /incomplete/);
  assert.throws(() => walletNetwork({
    ...config,
    chainId: 123
  }), /incomplete/);
});
test('published project network supersedes fallback without a hardcoded mainnet ID', async () => {
  const config = {
    chainId: 777777,
    rpcUrl: 'https://rpc.example.org',
    explorer: 'https://scan.example.org',
    networkName: 'Arc Mainnet'
  };
  const w = wallet({
    chain: target
  });
  await ensureWalletNetwork(w, config);
  assert.equal(w.calls.find(x => x.method === 'wallet_switchEthereumChain').params[0].chainId, '0xbde31');
  assert.equal(w.calls.some(x => x.method === 'wallet_addEthereumChain'), false);
});
test('already selected network does not trigger wallet prompts', async () => {
  const w = wallet({
    chain: target
  });
  await ensureWalletNetwork(w, {});
  assert.ok(w.calls.every(x => x.method === 'eth_chainId'));
});
test('wrong known network switches without adding it', async () => {
  const w = wallet();
  await ensureWalletNetwork(w, {});
  assert.equal(w.calls.filter(x => x.method === 'wallet_switchEthereumChain').length, 1);
  assert.equal(w.calls.some(x => x.method === 'wallet_addEthereumChain'), false);
});
test('unknown network is added with native USDC settings; wallets that do not auto-switch are switched explicitly', async () => {
  const w = wallet({
    unknown: true,
    autoSwitch: false
  });
  await ensureWalletNetwork(w, {});
  const add = w.calls.find(x => x.method === 'wallet_addEthereumChain').params[0];
  assert.equal(add.chainName, 'Arc Testnet');
  assert.equal(add.chainId, '0x4cef52');
  assert.deepEqual(add.nativeCurrency, {
    name: 'USDC',
    symbol: 'USDC',
    decimals: 18
  });
  assert.deepEqual(add.rpcUrls, ['https://rpc.testnet.arc.io']);
  assert.deepEqual(add.blockExplorerUrls, ['https://testnet.arcscan.app']);
  assert.equal(w.calls.filter(x => x.method === 'wallet_switchEthereumChain').length, 2);
});
test('declined or pending requests stop preparation without trying to add a network', async () => {
  for (const code of [4001, -32002, 4200]) {
    const w = wallet({
      reject: {
        code
      }
    });
    await assert.rejects(ensureWalletNetwork(w, {}), e => e.code === code);
    assert.equal(w.calls.some(x => x.method === 'wallet_addEthereumChain'), false);
  }
  assert.equal(readableError({
    data: {
      originalError: {
        code: 4001
      }
    }
  }), 'Wallet request cancelled.');
});
test('wallet success responses on the wrong chain are not accepted', async () => {
  await assert.rejects(ensureWalletNetwork(wallet({
    noSwitch: true
  }), {}), /Switch to Arc Testnet/);
});
test('connect requests accounts before network setup and preserves undeployed project configuration', async () => {
  const w = wallet({
      unknown: true,
      autoSwitch: false
    }),
    source = {
      config: {
        chainId: 0,
        rpcUrl: '',
        address: null
      },
      provider: null
    };
  const ctx = await connectWallet(source, false, {
    provider: w,
    name: 'Test wallet',
    id: 'test'
  });
  try {
    assert.equal(w.calls[0].method, 'eth_requestAccounts');
    assert.equal(ctx.account, account);
    assert.equal(ctx.config, source.config);
    assert.equal(ctx.walletNetwork.chainId, target);
    await assertWalletSession(ctx);
    const requests = w.calls.filter(x => x.method === 'eth_requestAccounts').length;
    const next = await connectWallet(ctx, false, {
      provider: w,
      name: 'Test wallet',
      id: 'test'
    }, false);
    try {
      assert.equal(w.calls.filter(x => x.method === 'eth_requestAccounts').length, requests);
    } finally {
      next.walletProvider.destroy();
    }
  } finally {
    ctx.walletProvider.destroy();
  }
});
test('nested unknown-chain errors add the network and verify the resulting chain', async () => {
  const w = wallet({
      unknown: true
    }),
    request = w.request;
  w.request = async args => {
    try {
      return await request(args);
    } catch (e) {
      if (e.code === 4902) throw {
        code: -32603,
        data: {
          originalError: e
        }
      };
      throw e;
    }
  };
  await ensureWalletNetwork(w, {});
  assert.equal(w.calls.filter(x => x.method === 'wallet_addEthereumChain').length, 1);
});
