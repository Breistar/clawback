/**
 * Minimal outline icon set for the sidebar/header — hand-rolled so we don't
 * pull in an icon library for a dozen glyphs. Stroke-based, 1.75px, matches
 * the reference aesthetic (light, editorial, not filled).
 */
import type { SVGProps } from 'react';

const base = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export type IconName = 'grid' | 'brain' | 'alert' | 'users' | 'chart' | 'chat' | 'bell' | 'settings' | 'arrow-right' | 'external' | 'claw' | 'clock' | 'trend-up' | 'file' | 'check';

export function Icon({ name, ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  switch (name) {
    case 'grid':
      return (
        <svg {...base} {...props}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case 'brain':
      return (
        <svg {...base} {...props}>
          <path d="M9 4a3 3 0 0 0-3 3v.3A3 3 0 0 0 4.5 10a3 3 0 0 0 1 5.6A3 3 0 0 0 8 20a3 3 0 0 0 1-.2" />
          <path d="M15 4a3 3 0 0 1 3 3v.3a3 3 0 0 1 1.5 2.7 3 3 0 0 1-1 5.6 3 3 0 0 1-2.5 4.4 3 3 0 0 1-1-.2" />
          <path d="M9 4v16M15 4v16" />
        </svg>
      );
    case 'alert':
      return (
        <svg {...base} {...props}>
          <path d="M10.3 3.9 2.6 17.5A1.6 1.6 0 0 0 4 20h16a1.6 1.6 0 0 0 1.4-2.5L13.7 3.9a1.6 1.6 0 0 0-2.8 0Z" />
          <path d="M12 9v4M12 16.5h.01" />
        </svg>
      );
    case 'users':
      return (
        <svg {...base} {...props}>
          <circle cx="9" cy="8" r="3.2" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
          <circle cx="17" cy="9" r="2.6" /><path d="M15 14.2a4.5 4.5 0 0 1 6 4.2" />
        </svg>
      );
    case 'chart':
      return (
        <svg {...base} {...props}>
          <path d="M4 20V10M11 20V4M18 20v-7" />
        </svg>
      );
    case 'chat':
      return (
        <svg {...base} {...props}>
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8A2.5 2.5 0 0 1 17.5 16H10l-4.5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5Z" />
        </svg>
      );
    case 'bell':
      return (
        <svg {...base} {...props}>
          <path d="M6 9a6 6 0 0 1 12 0c0 4.2 1 5.8 1.6 6.5H4.4C5 14.8 6 13.2 6 9Z" />
          <path d="M9.5 19a2.5 2.5 0 0 0 5 0" />
        </svg>
      );
    case 'settings':
      return (
        <svg {...base} {...props}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 13.5a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.9 2.9l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.9-2.9l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1h-.2a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.1 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.9-2.9l.1.1a1.7 1.7 0 0 0 1.9.3H8.8A1.7 1.7 0 0 0 9.8 3v-.2a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.9 2.9l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.6 1h.2a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.6 1Z" />
        </svg>
      );
    case 'arrow-right':
      return (
        <svg {...base} {...props}>
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      );
    case 'external':
      return (
        <svg {...base} {...props}>
          <path d="M14 4h6v6M20 4 10 14M8 4H5.5A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V16" />
        </svg>
      );
    case 'clock':
      return (
        <svg {...base} {...props}>
          <circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" />
        </svg>
      );
    case 'trend-up':
      return (
        <svg {...base} {...props}>
          <path d="M4 16l5.5-5.5L13 14l7-7" /><path d="M15 7h5v5" />
        </svg>
      );
    case 'file':
      return (
        <svg {...base} {...props}>
          <path d="M7 3.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V5A1.5 1.5 0 0 1 7 3.5Z" /><path d="M14 3.5V8h4.5" />
        </svg>
      );
    case 'check':
      return (
        <svg {...base} {...props}>
          <path d="M5 12.5 9.5 17 19 7" />
        </svg>
      );
    case 'claw':
      return (
        <svg {...base} {...props}>
          <path d="M6 3c-1 3-1 6 .5 9M12 3c-.6 3.2-.6 6.4.5 9M18 3c1 3 1 6-.5 9" />
          <path d="M5 12c1.5 4 4 7 7 9 3-2 5.5-5 7-9" />
        </svg>
      );
  }
}
