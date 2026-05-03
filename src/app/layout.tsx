import type { Metadata } from 'next';
import { Newsreader, IBM_Plex_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const newsreader = Newsreader({
  variable: '--font-newsreader',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
  display: 'swap',
});

const plexSans = IBM_Plex_Sans({
  variable: '--font-plex-sans',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Council',
  description: 'Multi-LLM deliberation workspace',
};

// Runs before React hydrates. Reads the persisted theme (or system pref)
// and sets data-theme on <html> so the page paints in the right colors
// instead of flashing light → dark on reload.
const NO_FLASH_SCRIPT = `
(function() {
  try {
    var stored = localStorage.getItem('council:theme');
    var theme = stored === 'dark' || stored === 'light'
      ? stored
      : (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = theme;
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="light"
      // The no-flash script in <head> mutates data-theme based on
      // localStorage / prefers-color-scheme BEFORE React hydrates, so
      // the SSR-rendered value won't match. That's intentional — tell
      // React not to warn about it.
      suppressHydrationWarning
      className={`${newsreader.variable} ${plexSans.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
