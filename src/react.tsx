import * as React from 'react';
import { glowmoji, autoBlink, blink as blinkFn, type GlowmojiOptions } from './index';

export type GlowmojiProps = Omit<GlowmojiOptions, 'name'> & {
  name: string;
  /** Render as an <img> tag via data URI instead of inline SVG. Default: false */
  asImg?: boolean;
  /** Auto-blink on a random interval. Default: true */
  blink?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

export function Glowmoji({ name, size = 64, shape, color, transparent, asImg = false, blink = true, className, style }: GlowmojiProps) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const { svg, dataUri } = glowmoji({ name, size, shape, color, transparent });

  React.useEffect(() => {
    if (!blink || !ref.current) return;
    const el = ref.current;
    const onClick = () => blinkFn(el);
    el.addEventListener('click', onClick);
    const stop = autoBlink(el);
    return () => { stop(); el.removeEventListener('click', onClick); };
  }, [blink, name, size, shape, color]);

  if (asImg) {
    return <img src={dataUri} alt={name} width={size} height={size} className={className} style={style} />;
  }

  return (
    <span
      ref={ref}
      className={className}
      style={{ display: 'inline-block', lineHeight: 0, cursor: blink ? 'pointer' : 'default', ...style }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export default Glowmoji;
