# @vsc.eco/sdk

High-level client for the Magi (VSC) cross-chain DEX. Wraps [`@vsc.eco/core`](https://github.com/vsc-eco/crosschain-sdk/tree/main/packages/core) with pool, price, and balance providers plus a `quickSwap()` orchestrator that composes the 1- or 2-hop swap, signs via [Aioha](https://github.com/aioha-hive/aioha), and broadcasts.

Supports HIVE ↔ HBD ↔ BTC — all swaps are mainnet-to-mainnet; the VSC L2 is used internally for routing.

## Install

```sh
pnpm add @vsc.eco/sdk
# optional, for signing HIVE/HBD input:
pnpm add @aioha/aioha
```

## Signed swap (HIVE/HBD input)

```ts
import { createMagi, CoinAmount } from '@vsc.eco/sdk';
import { KeyTypes } from '@aioha/aioha';

const magi = createMagi({ aioha });

const { txId } = await magi.quickSwap(
  {
    username: 'alice',
    assetIn: 'HBD',
    amountIn: CoinAmount.fromDecimal('10', 'HBD'),
    assetOut: 'BTC',
    recipient: 'bc1q...'
  },
  KeyTypes.Active
);
```

## Build-only (broadcast yourself)

```ts
const { ops, preview } = await magi.buildQuickSwap({ /* ... */ });
// ops = [transferOp, customJsonOp] — pass to your own signer
```

## BTC-input flow (no wallet connection)

```ts
const { address } = await magi.getBtcDepositAddress({
  recipient: 'alice',
  assetOut: 'HIVE',
  destinationChain: 'HIVE'
});
// User sends BTC to `address` from any wallet; mapping bot handles the rest.
```

## See also

- [`@vsc.eco/core`](https://github.com/vsc-eco/crosschain-sdk/tree/main/packages/core) — the math + op layer used by this client.
- [`@vsc.eco/widget`](https://github.com/vsc-eco/crosschain-sdk/tree/main/packages/widget) — drop-in UI built on this SDK.
- [Repository README](https://github.com/vsc-eco/crosschain-sdk#readme) — integration paths, referral-fee model, full API surface.
