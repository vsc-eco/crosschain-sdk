# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo shape

pnpm workspace (pnpm 10.33). Three published packages in `packages/*` plus a demo app in `examples/demo`.

```
@vsc.eco/core     pure math + op builders, no network, no framework
   ↑
@vsc.eco/sdk      pool/price/balance providers + quickSwap orchestrator
   ↑
@vsc.eco/widget   React <MagiQuickSwap/> and <magi-quickswap> web component
```

The dependency direction is one-way: `core` imports nothing from `sdk`/`widget`; `sdk` imports only `core`; `widget` imports both. Preserve this — putting network calls or framework code into `@vsc.eco/core` breaks its "zero deps, pure functions" contract.

## Commands

```bash
pnpm install
pnpm build           # tsup → dist/ in every package (esm + .d.ts)
pnpm test            # vitest run across all packages (includes LIVE API tests)
pnpm typecheck       # tsc --noEmit per package
pnpm demo            # vite dev server for examples/demo at :5173
```

Per-package (run inside a package dir, or `pnpm --filter @vsc.eco/core test`):

```bash
pnpm --filter @vsc.eco/core test
pnpm --filter @vsc.eco/sdk test -- tests/quickSwap.test.ts          # single file
pnpm --filter @vsc.eco/sdk test -- -t "referral"                    # by test name
```

`pnpm test` hits real endpoints (`indexer.magi.milohpr.com`, `api.hive.blog`, `btc.magi.milohpr.com`) — some tests will fail offline. That is intentional; see `packages/core/tests/live-snapshot.test.ts` for the byte-for-byte fixture tests against real on-chain txs.

## Swap flow — what the code actually does

All swaps are mainnet-Hive → mainnet-Hive (or mainnet-BTC). The VSC/Magi L2 is used internally for routing. For HIVE/HBD input, `buildQuickSwap()` produces **two ops**:

1. `transfer` — L1 → `vsc.gateway` (the deposit; memo carries the target DID)
2. `custom_json` with `id: 'vsc.call'` — DEX router invocation with `destination_chain` set so the L2 settles back to L1

For BTC input, there is no user-signed op — the caller uses `getBtcDepositAddress()` to get a watch address from the mapping bot, then the user sends BTC from any wallet and the mapping bot handles the swap + settlement.

`quickSwap()` = `buildQuickSwap()` + sign-and-broadcast via Aioha. Callers without Aioha should use `buildQuickSwap()` and broadcast themselves (this is the Keychain-extension integration path).

### Routing: 1-hop vs 2-hop

`previewSwap()` in `packages/sdk/src/quickSwap.ts` tries the direct pool first; if missing, falls back to HIVE↔HBD↔BTC via HBD as the intermediate. The router does the same autodiscovery on-chain, so the preview and the final settlement agree.

### Fee model

Fees are **output-denominated** (`grossOut = Y − X·Y/(X+x)`, then fees carved off). BigInt throughout — no floats in pricing paths. The formula is ported verbatim from `altera-app/src/lib/pools/swapCalc.ts` and any change to `calculateSwap`/`calculateTwoHopSwap` must track the Altera/Go-contract formula or preview ≠ settlement. The `math.test.ts` fixtures pin the expected byte-level results.

### Referral fees

Only apply when: `destination_chain` is set AND `assetOut` ∉ {HIVE, HBD} AND `inputUsd ≥ usdThreshold`. When active, the payload gets `beneficiary` + `ref_bps`, and `min_amount_out` is pre-scaled down by `bps` so the post-skim router delivery still satisfies the user's minimum. See `referralQualifies()` in `packages/core/src/ops/swap.ts`.

## Units & asset decimals

Defined once in `ASSET_DECIMALS` (`packages/core/src/types/index.ts`): HIVE=3, HBD=3, BTC=8. Always go through `CoinAmount` for user input — it rejects over-precision strings and enforces non-negative integers. Internal math operates on `raw` (BigInt smallest-units); decimal strings are only for L1 transfer memos and UI.

## Widget architecture

`<MagiQuickSwap>` is the React component; `webcomponent.tsx` wraps it with `@r2wc/react-to-web-component` and registers `<magi-quickswap>`. Object-valued props (`aioha`, `config`, providers, `keyType`, callbacks) **must** be set via JS properties on the element, not HTML attributes — the web-component registration uses `'json'` / `'function'` types for these.

`createMagi()` is called twice in `QuickSwap.tsx` to wire the default `PoolPriceProvider` using the client's own pool provider. That double-call is intentional — it lets `prices` default to a provider built from the same pool cache the client uses. Don't "simplify" it without understanding the dependency.

Theming is pure CSS custom properties (`--magi-*`) scoped to `.magi-quickswap`. The dark theme lives at `@vsc.eco/widget/themes/altera-dark.css`.

## Testing notes

- `packages/core/tests/live-snapshot.test.ts` — rebuilds real on-chain swap ops and asserts byte-for-byte equality with Altera broadcasts. Update the fixture tx hash + block only when the contract or op layout legitimately changes.
- `packages/sdk/tests/mappingBot.test.ts` — hits the live mapping-bot endpoint. Skip / stub when working offline.
- Configs in `packages/core/src/types/index.ts` (`MAINNET_CONFIG`, `TESTNET_CONFIG`) hold contract IDs pulled from `altera-app/src/client.ts` + `altera-app/src/lib/constants.ts` at commit `3730e52`. If contracts are redeployed, update both configs together.

## TypeScript setup

Strict mode, `moduleResolution: "Bundler"`, ESM-only (`"type": "module"`), target ES2022. Relative imports use `.js` extensions (TS bundler resolution expects the emitted path) — preserve this when adding files. Each package has its own `tsconfig.json` extending `tsconfig.base.json`.

Build is `tsup` emitting ESM + `.d.ts` only. `@vsc.eco/widget` copies CSS verbatim and inlines SVGs as data URLs via tsup loaders.
