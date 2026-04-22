# @vsc.eco/core

Pure swap math and operation builders for the Magi (VSC) L2 DEX. Zero runtime dependencies, no network calls.

Ports the CLP swap formula from the Altera app and emits the exact L1 ops (`transfer` + `custom_json`) that the router expects, so callers can preview, build, and broadcast swaps without any framework.

## Install

```sh
pnpm add @vsc.eco/core
```

## Usage

```ts
import {
  calculateSwap,
  getHiveDepositOp,
  getHiveSwapOp,
  CoinAmount,
  MAINNET_CONFIG
} from '@vsc.eco/core';

const amount = CoinAmount.fromDecimal('10', 'HBD');

const { expectedOutput, minAmountOut } = calculateSwap(
  amount.raw,
  reserveIn,
  reserveOut,
  100 // 1% slippage, in bps
);

const depositOp = getHiveDepositOp({
  from: 'alice',
  toDid: 'hive:alice',
  amount,
  config: MAINNET_CONFIG
});
```

## See also

- [`@vsc.eco/sdk`](https://github.com/vsc-eco/crosschain-sdk/tree/main/packages/sdk) — higher-level client with pool/price/balance providers and `quickSwap()`.
- [`@vsc.eco/widget`](https://github.com/vsc-eco/crosschain-sdk/tree/main/packages/widget) — drop-in React + web component UI.
- [Repository README](https://github.com/vsc-eco/crosschain-sdk#readme) — full architecture, routing rules, swap paths.
