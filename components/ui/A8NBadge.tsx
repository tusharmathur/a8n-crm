interface A8NBadgeProps {
  size?: number;
}

/** Purple circular A8N badge — replaces the full Acceler8Now logo image. */
export function A8NBadge({ size = 32 }: A8NBadgeProps) {
  const fontSize = Math.round(size * 0.31);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-label="A8N"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="16" cy="16" r="16" fill="#6B21A8" />
      <text
        x="16"
        y="20.5"
        textAnchor="middle"
        fill="white"
        fontSize={fontSize}
        fontWeight="700"
        fontFamily="system-ui, sans-serif"
      >
        A8N
      </text>
    </svg>
  );
}
