import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

const SPECKLES = [
  { top: 30, left: 44, s: 6, o: 0.8 },
  { top: 24, left: 122, s: 4, o: 0.6 },
  { top: 64, left: 148, s: 7, o: 0.7 },
  { top: 92, left: 24, s: 5, o: 0.55 },
  { top: 130, left: 140, s: 5, o: 0.6 },
  { top: 142, left: 48, s: 6, o: 0.7 },
  { top: 56, left: 20, s: 4, o: 0.5 },
]

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#263A6E',
          display: 'flex',
          position: 'relative',
        }}
      >
        {SPECKLES.map((sp, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: sp.top,
              left: sp.left,
              width: sp.s,
              height: sp.s,
              borderRadius: '50%',
              background: '#F7C59F',
              opacity: sp.o,
            }}
          />
        ))}
        <div style={{ position: 'absolute', top: 36, left: 51, width: 78, height: 17, background: '#FF914D', borderRadius: 9 }} />
        <div style={{ position: 'absolute', top: 40, left: 82, width: 16, height: 86, background: '#FF914D', borderRadius: 5 }} />
        <div
          style={{
            position: 'absolute',
            top: 110,
            left: 56,
            width: 50,
            height: 37,
            background: '#FF914D',
            borderRadius: '50%',
            transform: 'rotate(-18deg)',
          }}
        />
      </div>
    ),
    size
  )
}
