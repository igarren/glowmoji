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
<script>
  const { svg } = glowmoji({ name: 'Alice' });
  document.getElementById('avatar').innerHTML = svg;
</script>
```

---

## usage

### vanilla / any framework

```ts
import { glowmoji } from 'glowmoji';

const { svg, dataUri } = glowmoji({ name: 'Alice' });

// inline SVG
el.innerHTML = svg;

// or as an image
img.src = dataUri;
```

### react

```tsx
import { Glowmoji } from 'glowmoji/react';

<Glowmoji name="Alice" />
<Glowmoji name="Alice" size={48} shape="circle" color="#a78bfa" />
```

Requires React 17+. Works with whatever version your project already has.

---

## options

| prop | type | default | description |
|---|---|---|---|
| `name` | `string` | — | seed for the avatar. same name = same result |
| `size` | `number` | `64` | width & height in px |
| `shape` | `Shape` | `squircle` | `square` · `squircle` · `circle` |
| `color` | `string` | — | hex color override, e.g. `#ff6b6b` |

the `color` prop replaces the auto palette. glow is derived automatically.

---

## types

```ts
type Shape = 'square' | 'squircle' | 'circle';

interface GlowmojiOptions {
  name: string;
  size?: number;
  shape?: Shape;
  color?: string;
}

interface GlowmojiResult {
  svg: string;
  dataUri: string;
  palette: Palette;
}
```

---

## license

MIT
