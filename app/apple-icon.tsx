import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#263A6E',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="180" height="180" viewBox="0 0 512 512">
          <g fill="#FF914D">
            <rect x="146" y="112" width="212" height="44" rx="8" />
            <rect x="230" y="112" width="44" height="248" rx="4" />
            <ellipse cx="218" cy="368" rx="66" ry="44" transform="rotate(-18 218 368)" />
          </g>
          <path
            d="M 388,296 C 388,278 340,278 340,300 C 340,322 388,318 388,340 C 388,362 340,362 340,344"
            fill="none"
            stroke="#FF914D"
            strokeWidth="24"
            strokeLinecap="round"
            transform="rotate(-10 364 320)"
          />
        </svg>
      </div>
    ),
    size
  )
}
