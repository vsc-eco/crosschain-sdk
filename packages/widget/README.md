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
