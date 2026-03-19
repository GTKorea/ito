'use client';

interface ThreadVisualProps {
  className?: string;
  opacity?: number;
  speed?: number;
}

export function ThreadVisual({
  className = '',
  opacity = 0.4,
  speed = 1,
}: ThreadVisualProps) {
  const duration = 3 / speed;

  return (
    <svg
      viewBox="0 0 600 400"
      fill="none"
      className={`pointer-events-none select-none ${className}`}
      style={{ opacity }}
    >
      <defs>
        <linearGradient id="thread-grad-1" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id="thread-grad-2" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id="thread-grad-3" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#c084fc" stopOpacity="0.2" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="node-glow">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Thread lines */}
      <path
        d="M 100,200 C 200,140 250,260 350,200"
        stroke="url(#thread-grad-1)"
        strokeWidth="2"
        strokeDasharray="8 6"
        filter="url(#glow)"
      >
        <animate
          attributeName="stroke-dashoffset"
          from="0"
          to="-28"
          dur={`${duration}s`}
          repeatCount="indefinite"
        />
      </path>

      <path
        d="M 350,200 C 420,150 450,250 530,180"
        stroke="url(#thread-grad-2)"
        strokeWidth="2"
        strokeDasharray="8 6"
        filter="url(#glow)"
      >
        <animate
          attributeName="stroke-dashoffset"
          from="0"
          to="-28"
          dur={`${duration * 1.2}s`}
          repeatCount="indefinite"
        />
      </path>

      <path
        d="M 100,200 C 150,300 280,320 350,280"
        stroke="url(#thread-grad-3)"
        strokeWidth="1.5"
        strokeDasharray="6 8"
        filter="url(#glow)"
      >
        <animate
          attributeName="stroke-dashoffset"
          from="0"
          to="-28"
          dur={`${duration * 0.8}s`}
          repeatCount="indefinite"
        />
      </path>

      <path
        d="M 350,280 C 400,260 480,300 530,260"
        stroke="url(#thread-grad-2)"
        strokeWidth="1.5"
        strokeDasharray="6 8"
        filter="url(#glow)"
      >
        <animate
          attributeName="stroke-dashoffset"
          from="0"
          to="-28"
          dur={`${duration * 1.4}s`}
          repeatCount="indefinite"
        />
      </path>

      {/* Extra subtle thread */}
      <path
        d="M 60,120 C 140,100 200,160 280,130"
        stroke="url(#thread-grad-3)"
        strokeWidth="1"
        strokeDasharray="4 8"
        opacity="0.5"
      >
        <animate
          attributeName="stroke-dashoffset"
          from="0"
          to="-24"
          dur={`${duration * 1.6}s`}
          repeatCount="indefinite"
        />
      </path>

      {/* Nodes */}
      {[
        { cx: 100, cy: 200, r: 20, label: 'A' },
        { cx: 350, cy: 200, r: 18, label: 'B' },
        { cx: 530, cy: 180, r: 16, label: 'C' },
        { cx: 350, cy: 280, r: 14, label: 'D' },
        { cx: 530, cy: 260, r: 14, label: 'E' },
      ].map((node, i) => (
        <g key={i}>
          <circle
            cx={node.cx}
            cy={node.cy}
            r={node.r + 6}
            fill="#6366f1"
            opacity="0.15"
            filter="url(#node-glow)"
          >
            <animate
              attributeName="opacity"
              values="0.1;0.2;0.1"
              dur={`${2 + i * 0.5}s`}
              repeatCount="indefinite"
            />
          </circle>
          <circle
            cx={node.cx}
            cy={node.cy}
            r={node.r}
            fill="#1a1a1a"
            stroke="#6366f1"
            strokeWidth="1.5"
            opacity="0.9"
          />
          <text
            x={node.cx}
            y={node.cy + 1}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#a5b4fc"
            fontSize={node.r * 0.8}
            fontFamily="Inter, sans-serif"
            fontWeight="500"
          >
            {node.label}
          </text>
        </g>
      ))}

      {/* Traveling dots */}
      <circle r="3" fill="#818cf8" filter="url(#glow)">
        <animateMotion
          dur={`${duration}s`}
          repeatCount="indefinite"
          path="M 100,200 C 200,140 250,260 350,200"
        />
      </circle>
      <circle r="2.5" fill="#a78bfa" filter="url(#glow)">
        <animateMotion
          dur={`${duration * 1.2}s`}
          repeatCount="indefinite"
          path="M 350,200 C 420,150 450,250 530,180"
        />
      </circle>
    </svg>
  );
}
