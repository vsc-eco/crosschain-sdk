# @vsc.eco/crosschain-widget

Drop-in cross-chain swap UI for the Magi (VSC) DEX. Ships as both a React component (`<MagiQuickSwap>`) and a web component (`<magi-quickswap>`), driving [`@vsc.eco/crosschain-sdk`](https://github.com/vsc-eco/crosschain-sdk/tree/main/packages/sdk) under the hood.

Supports HIVE ↔ HBD ↔ BTC, live preview with USD values, slippage controls, Hive L1 balance queries, and the BTC-input deposit-address flow.

## Install

```sh
pnpm add @vsc.eco/crosschain-widget react react-dom @aioha/aioha
```

## React

```tsx
import { MagiQuickSwap } from '@vsc.eco/crosschain-widget';
import { KeyTypes } from '@aioha/aioha';

<MagiQuickSwap
  aioha={aiohaInstance}
  username="alice"
  keyType={KeyTypes.Active}
  onSuccess={(txId) => console.log('Broadcast:', txId)}
/>
```

## Direct signer (no Aioha)

For hosts that don't use Aioha — Peakd, Keychain-only apps, backend / CLI integrations — pass an `onBroadcast` callback. It takes precedence over `aioha` and receives the build-+-simulate-tightened ops; your callback only has to sign and broadcast.

```tsx
import { MagiQuickSwap } from '@vsc.eco/crosschain-widget';
import { Client, PrivateKey, type Operation } from '@hiveio/dhive';

const client = new Client('https://api.hive.blog');
const key = PrivateKey.fromString(activeWif); // load from env / secret store

<MagiQuickSwap
  username="alice"
  onBroadcast={async (ops) => {
    const result = await client.broadcast.sendOperations(ops as Operation[], key);
    return { txId: result.id };
  }}
/>
```

Keychain integration looks the same with `window.hive_keychain.requestBroadcast(...)` inside the callback. Never accept a user-typed private key into a browser widget.

## Web component

```html
<script type="module">
  import '@vsc.eco/crosschain-widget/webcomponent';
</script>

<magi-quickswap id="swap"></magi-quickswap>

<script>
  const el = document.getElementById('swap');
  // Object props MUST be set as JS properties, not HTML attributes
  el.aioha = aiohaInstance;
  el.username = 'alice';
  el.keyType = KeyTypes.Active;
  el.onSuccess = (txId) => console.log(txId);
</script>
```

## Theming

The widget uses CSS custom properties scoped to `.magi-quickswap`. Override any `--magi-*` variable to match your host app, or import the bundled Altera dark theme:

```ts
import '@vsc.eco/crosschain-widget/themes/altera-dark.css';
```

## See also

- [`@vsc.eco/crosschain-sdk`](https://github.com/vsc-eco/crosschain-sdk/tree/main/packages/sdk) — the client the widget is built on.
- [`@vsc.eco/crosschain-core`](https://github.com/vsc-eco/crosschain-sdk/tree/main/packages/core) — pure math + op builders.
- [Repository README](https://github.com/vsc-eco/crosschain-sdk#readme) — full prop list, theming variables, integration examples.
