interface SparklineProps {
  data: number[];
  stroke?: string;
  fill?: string;
  height?: number;
  width?: number;
  className?: string;
}

/** Lightweight inline-SVG sparkline. Values are auto-scaled. */
export function Sparkline({
  data,
  stroke = "hsl(var(--primary))",
  fill = "hsl(var(--primary) / 0.15)",
  height = 60,
  width = 280,
  className,
}: SparklineProps) {
  if (data.length < 2) {
    return (
      <svg width={width} height={height} className={className}>
        <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="hsl(var(--muted))" strokeDasharray="3 3" />
      </svg>
    );
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);
  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 6) - 3;
    return [x, y] as const;
  });
  const path = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${path} L${width},${height} L0,${height} Z`;

  return (
    <svg width={width} height={height} className={className} preserveAspectRatio="none" viewBox={`0 0 ${width} ${height}`}>
      <path d={area} fill={fill} />
      <path d={path} fill="none" stroke={stroke} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
