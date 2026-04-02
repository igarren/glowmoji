import * as React from 'react';
import { glowmoji, type GlowmojiOptions } from './index';

export type GlowmojiProps = Omit<GlowmojiOptions, 'name'> & {
  name: string;
  /** Render as an <img> tag via data URI instead of inline SVG. Default: false */
  asImg?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

export function Glowmoji({ name, size = 64, shape, color, asImg = false, className, style }: GlowmojiProps) {
  const { svg, dataUri } = glowmoji({ name, size, shape, color });

  if (asImg) {
    return <img src={dataUri} alt={name} width={size} height={size} className={className} style={style} />;
  }

  return (
    <span
      className={className}
      style={{ display: 'inline-block', lineHeight: 0, ...style }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export default Glowmoji;
