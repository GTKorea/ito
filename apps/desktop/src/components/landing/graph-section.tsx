'use client';

import { useTranslations } from 'next-intl';
import { useScrollAnimation } from './use-scroll-animation';

const GRAPH_NODES = [
  { x: 120, y: 80, label: 'You', size: 24, color: '#e5e5e5' },
  { x: 300, y: 60, label: 'Sarah', size: 20, color: '#a3a3a3' },
  { x: 480, y: 100, label: 'Mike', size: 18, color: '#737373' },
  { x: 220, y: 200, label: 'Alex', size: 20, color: '#a3a3a3' },
  { x: 400, y: 220, label: 'Jina', size: 16, color: '#737373' },
  { x: 560, y: 200, label: 'Tom', size: 14, color: '#737373' },
  { x: 140, y: 300, label: 'Kai', size: 16, color: '#a3a3a3' },
  { x: 340, y: 320, label: 'Emi', size: 14, color: '#737373' },
];

const GRAPH_EDGES: [number, number, string][] = [
  [0, 1, '#525252'],
  [1, 2, '#525252'],
  [0, 3, '#525252'],
  [3, 4, '#404040'],
  [2, 5, '#404040'],
  [3, 6, '#404040'],
  [4, 7, '#404040'],
  [1, 4, '#404040'],
];

export function GraphSection() {
  const t = useTranslations('landing');
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section ref={ref} className="relative py-16 sm:py-24">
      <div
        className={`mx-auto max-w-6xl px-6 transition-all duration-700 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}
      >
        {/* Header */}
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            {t('graph.title')}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
            {t('graph.subtitle')}
          </p>
        </div>

        {/* Graph card */}
        <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-border bg-card/30">
          <div className="p-4 sm:p-8">
            <svg
              viewBox="0 0 680 400"
              fill="none"
              className="mx-auto w-full"
            >
              <defs>
                <filter id="graph-glow">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Edges */}
              {GRAPH_EDGES.map(([from, to, color], i) => {
                const n1 = GRAPH_NODES[from];
                const n2 = GRAPH_NODES[to];
                const mx = (n1.x + n2.x) / 2;
                const my = (n1.y + n2.y) / 2 - 20;
                return (
                  <g key={`edge-${i}`}>
                    <path
                      d={`M ${n1.x} ${n1.y} Q ${mx} ${my} ${n2.x} ${n2.y}`}
                      stroke={color}
                      strokeWidth="1.5"
                      strokeOpacity="0.3"
                      fill="none"
                    />
                    {/* Traveling dot */}
                    <circle r="2" fill={color} opacity="0.8" filter="url(#graph-glow)">
                      <animateMotion
                        dur={`${3 + i * 0.5}s`}
                        repeatCount="indefinite"
                        path={`M ${n1.x} ${n1.y} Q ${mx} ${my} ${n2.x} ${n2.y}`}
                      />
                    </circle>
                  </g>
                );
              })}

              {/* Nodes */}
              {GRAPH_NODES.map((node, i) => (
                <g key={`node-${i}`}>
                  {/* Glow */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.size + 8}
                    fill={node.color}
                    opacity="0.08"
                    filter="url(#graph-glow)"
                  >
                    <animate
                      attributeName="opacity"
                      values="0.05;0.12;0.05"
                      dur={`${3 + i * 0.3}s`}
                      repeatCount="indefinite"
                    />
                  </circle>
                  {/* Circle */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.size}
                    fill="#1a1a1a"
                    stroke={node.color}
                    strokeWidth="1.5"
                  />
                  {/* Label */}
                  <text
                    x={node.x}
                    y={node.y + node.size + 16}
                    textAnchor="middle"
                    fill="#a1a1aa"
                    fontSize="11"
                    fontFamily="Inter, sans-serif"
                  >
                    {node.label}
                  </text>
                  {/* Initial */}
                  <text
                    x={node.x}
                    y={node.y + 1}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={node.color}
                    fontSize={node.size * 0.7}
                    fontFamily="Inter, sans-serif"
                    fontWeight="600"
                  >
                    {node.label[0]}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
