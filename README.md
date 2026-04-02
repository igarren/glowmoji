# glowmoji

why use a plain grey circle when you can have a glowing little guy?

deterministic SVG avatars. same name, same face, every time. zero dependencies.

**[→ live demo & docs](https://igarren.github.io/glowmoji)**

```
npm install glowmoji
```

or via CDN (no build step needed):

```html
<script src="https://unpkg.com/glowmoji/dist/glowmoji.global.js"></script>
<body>
  <div id="avatar"></div>
  <script>
    glowmoji.mount(document.getElementById('avatar'), { name: 'Alice' });
  </script>
</body>
```

---

## usage

### vanilla / any framework

```ts
import { mount } from 'glowmoji';

// sets innerHTML, auto-blinks, click-to-blink — all wired up
const stop = mount(document.getElementById('avatar'), { name: 'Alice' });

// or manually if you need more control
import { glowmoji, autoBlink, blink } from 'glowmoji';
const { svg } = glowmoji({ name: 'Alice' });
el.innerHTML = svg;
el.addEventListener('click', () => blink(el));
const stop = autoBlink(el);
```

### react

```tsx
import { Glowmoji } from 'glowmoji/react';

<Glowmoji name="Alice" />
<Glowmoji name="Alice" size={48} shape="circle" color="#a78bfa" />

// disable auto-blink
<Glowmoji name="Alice" blink={false} />
```

Requires React 17+. Works with whatever version your project already has.

---

## options

| prop | type | default | description |
|---|---|---|---|
| `name` | `string` | — | seed for the avatar. same name = same result |
| `size` | `number` | `64` | width & height in px |
| `shape` | `Shape` | `rounded` | `square` · `rounded` · `circle` |
| `color` | `string` | — | hex color override, e.g. `#ff6b6b` |
| `transparent` | `boolean` | `false` | skip the dark bg — use on light pages |

the `color` prop replaces the auto palette. glow is derived automatically.

---

## blink

the result includes blink utilities you can wire up yourself:

```ts
const { svg, blink, autoBlink } = glowmoji({ name: 'Alice' });
el.innerHTML = svg;

// click to blink
el.addEventListener('click', () => blink(el));

// or start auto-blinking (returns a stop function)
const stop = autoBlink(el);
```

---

## types

```ts
type Shape = 'square' | 'rounded' | 'circle';

interface GlowmojiOptions {
  name: string;
  size?: number;
  shape?: Shape;
  color?: string;
  transparent?: boolean;
}

interface GlowmojiResult {
  svg: string;
  dataUri: string;
  palette: Palette;
  blink: (container: Element) => void;
  autoBlink: (container: Element) => () => void;
}
```

---

## license

MIT

---

if this made your app look cooler → [ko-fi.com/igarren](https://ko-fi.com/igarren)
