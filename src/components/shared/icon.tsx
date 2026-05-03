type IconName =
  | 'plus'
  | 'minus'
  | 'x'
  | 'check'
  | 'caret-up'
  | 'caret-down'
  | 'caret-right'
  | 'arrow-down'
  | 'sync'
  | 'doc'
  | 'expand'
  | 'collapse'
  | 'grip'
  | 'share'
  | 'gear'
  | 'history'
  | 'jump'
  | 'speaker'
  | 'sun'
  | 'moon';

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
}

export function Icon({ name, size = 14, className }: IconProps) {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 16 16',
    fill: 'none' as const,
    stroke: 'currentColor',
    strokeWidth: 1.25,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
  };
  switch (name) {
    case 'plus':
      return <svg {...props}><path d="M8 3v10M3 8h10" /></svg>;
    case 'minus':
      return <svg {...props}><path d="M3 8h10" /></svg>;
    case 'x':
      return <svg {...props}><path d="M4 4l8 8M12 4l-8 8" /></svg>;
    case 'check':
      return <svg {...props}><path d="M3 8l3 3 7-7" /></svg>;
    case 'caret-up':
      return <svg {...props}><path d="M3 10l5-5 5 5" /></svg>;
    case 'caret-down':
      return <svg {...props}><path d="M3 6l5 5 5-5" /></svg>;
    case 'caret-right':
      return <svg {...props}><path d="M6 3l5 5-5 5" /></svg>;
    case 'arrow-down':
      return <svg {...props}><path d="M8 3v10M4 9l4 4 4-4" /></svg>;
    case 'sync':
      return (
        <svg {...props}>
          <path d="M3 8a5 5 0 0 1 8.5-3.5L13 6M13 8a5 5 0 0 1-8.5 3.5L3 10" />
          <path d="M11 3v3h-3M5 13v-3h3" />
        </svg>
      );
    case 'doc':
      return <svg {...props}><path d="M4 2h5l3 3v9H4z" /><path d="M9 2v3h3" /></svg>;
    case 'expand':
      return <svg {...props}><path d="M3 6V3h3M13 6V3h-3M3 10v3h3M13 10v3h-3" /></svg>;
    case 'collapse':
      return <svg {...props}><path d="M6 3v3H3M10 3v3h3M6 13v-3H3M10 13v-3h3" /></svg>;
    case 'grip':
      return (
        <svg {...props}>
          <circle cx="6" cy="5" r="0.7" fill="currentColor" stroke="none" />
          <circle cx="10" cy="5" r="0.7" fill="currentColor" stroke="none" />
          <circle cx="6" cy="8" r="0.7" fill="currentColor" stroke="none" />
          <circle cx="10" cy="8" r="0.7" fill="currentColor" stroke="none" />
          <circle cx="6" cy="11" r="0.7" fill="currentColor" stroke="none" />
          <circle cx="10" cy="11" r="0.7" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'share':
      return (
        <svg {...props}>
          <circle cx="4" cy="8" r="1.8" />
          <circle cx="12" cy="4" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <path d="M5.5 7l5-2.5M5.5 9l5 2.5" />
        </svg>
      );
    case 'gear':
      return (
        <svg {...props}>
          <circle cx="8" cy="8" r="2" />
          <path d="M8 1.5v1.5M8 13v1.5M14.5 8H13M3 8H1.5M12.6 3.4l-1 1M4.4 11.6l-1 1M12.6 12.6l-1-1M4.4 4.4l-1-1" />
        </svg>
      );
    case 'history':
      return <svg {...props}><circle cx="8" cy="8" r="5.5" /><path d="M8 5v3l2 1.5" /></svg>;
    case 'jump':
      return (
        <svg {...props}>
          <path d="M8 3v8M5 8l3 3 3-3" />
          <path d="M3 13.5h10" />
        </svg>
      );
    case 'speaker':
      return <svg {...props}><circle cx="8" cy="8" r="5.5" /><circle cx="8" cy="8" r="2" /></svg>;
    case 'sun':
      return (
        <svg {...props}>
          <circle cx="8" cy="8" r="3" />
          <path d="M8 1.5v1.5M8 13v1.5M14.5 8H13M3 8H1.5M12.6 3.4l-1 1M4.4 11.6l-1 1M12.6 12.6l-1-1M4.4 4.4l-1-1" />
        </svg>
      );
    case 'moon':
      return (
        <svg {...props}>
          <path d="M13 9.5A6 6 0 1 1 6.5 3a4.5 4.5 0 0 0 6.5 6.5z" fill="currentColor" stroke="currentColor" />
        </svg>
      );
    default:
      return null;
  }
}
