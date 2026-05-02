'use client';

interface StreamingTextProps {
  text: string;
  isStreaming: boolean;
  className?: string;
}

export function StreamingText({ text, isStreaming, className = '' }: StreamingTextProps) {
  return (
    <div className={`${className} ${isStreaming ? 'streaming-cursor' : ''}`}>
      <div className="whitespace-pre-wrap break-words leading-relaxed">
        {text || (isStreaming ? '' : null)}
      </div>
    </div>
  );
}
