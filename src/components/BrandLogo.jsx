// The one WorkTrack logo: the "wt" tile (/favicon.svg) + "Work" ink, "Track" terracotta.
// Same component as the web app (guerrdenn12/worktrack); keep them in sync.
// The mark is bundled (hashed /assets/ URL) so browsers never show a stale cached copy.
import wtMark from '../assets/wt-mark.svg';

// light: white "Work" for dark backgrounds (same mark, readable on photos).
export default function BrandLogo({ size = 32, fontSize, stacked = false, light = false, style }) {
  const fs = fontSize || Math.round(size * 0.62);
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: stacked ? 'column' : 'row',
        alignItems: 'center',
        gap: stacked ? Math.round(size * 0.3) : Math.round(size * 0.31),
        ...style,
      }}
    >
      <img
        src={wtMark}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size, borderRadius: Math.round(size * 0.22), flexShrink: 0, display: 'block' }}
      />
      <span
        style={{
          fontSize: fs,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          lineHeight: 1,
          color: light ? '#FFFFFF' : '#1A1815',
          whiteSpace: 'nowrap',
        }}
      >
        Work<span style={{ color: '#C8542C' }}>Track</span>
      </span>
    </div>
  );
}
