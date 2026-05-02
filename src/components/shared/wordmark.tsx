interface WordmarkProps {
  size?: number;
}

export function Wordmark({ size = 20 }: WordmarkProps) {
  return (
    <span className="inline-flex items-baseline">
      <span
        className="serif text-ink"
        style={{
          fontSize: size,
          fontWeight: 400,
          letterSpacing: '0.005em',
        }}
      >
        Council
      </span>
      <span
        className="ml-1.5 inline-block bg-accent"
        style={{
          width: 4,
          height: 4,
          transform: 'translateY(-3px)',
        }}
      />
    </span>
  );
}
