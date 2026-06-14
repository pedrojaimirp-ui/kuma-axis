import { ROULETTE_PRIZES } from '@/lib/constants'

const SEGMENT_ANGLE = 360 / ROULETTE_PRIZES.length
const CENTER = 150
const RADIUS = 145
const LABEL_RADIUS = 90
const SEGMENT_COLORS = [
  { bg: '#F2B705', text: '#3B1A0A' },
  { bg: '#2D6A4F', text: '#FDF6EC' },
  { bg: '#C17817', text: '#FDF6EC' },
  { bg: '#9CCC3C', text: '#3B1A0A' },
]

function polarToCartesian(angleDeg: number, radius: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180
  return {
    x: CENTER + radius * Math.cos(angleRad),
    y: CENTER + radius * Math.sin(angleRad),
  }
}

function describeSegment(startAngle: number, endAngle: number) {
  const start = polarToCartesian(startAngle, RADIUS)
  const end = polarToCartesian(endAngle, RADIUS)
  return `M ${CENTER} ${CENTER} L ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 0 1 ${end.x} ${end.y} Z`
}

export function RouletteWheel({ rotation }: { rotation: number }) {
  return (
    <div className="relative mx-auto w-full max-w-xs">
      <div
        className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1"
        style={{
          width: 0,
          height: 0,
          borderLeft: '12px solid transparent',
          borderRight: '12px solid transparent',
          borderTop: '20px solid #5A3A22',
        }}
      />
      <svg
        viewBox="0 0 300 300"
        className="block"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: 'transform 3s cubic-bezier(0.17, 0.67, 0.12, 0.99)',
        }}
      >
        <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="#FDF6EC" stroke="#C9A84C" strokeWidth={4} />
        {ROULETTE_PRIZES.map((prize, i) => {
          const startAngle = i * SEGMENT_ANGLE
          const endAngle = startAngle + SEGMENT_ANGLE
          const midAngle = startAngle + SEGMENT_ANGLE / 2
          const colors = SEGMENT_COLORS[i % SEGMENT_COLORS.length]
          return (
            <g key={prize.match}>
              <path
                d={describeSegment(startAngle, endAngle)}
                fill={colors.bg}
                stroke="#FDF6EC"
                strokeWidth={1}
              />
              <g transform={`rotate(${midAngle} ${CENTER} ${CENTER})`}>
                <text
                  x={CENTER}
                  y={CENTER - LABEL_RADIUS}
                  fill={colors.text}
                  fontSize={11}
                  fontWeight={700}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(-90 ${CENTER} ${CENTER - LABEL_RADIUS})`}
                >
                  {prize.display}
                </text>
              </g>
            </g>
          )
        })}
        <circle cx={CENTER} cy={CENTER} r={18} fill="#C9A84C" stroke="#5A3A22" strokeWidth={3} />
      </svg>
    </div>
  )
}
