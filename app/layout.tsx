import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Biblia Sagrada Projector',
  description: 'Bíblia Sagrada offline para projeção com versões ARA, ACF e NVI, busca de versículos e compartilhamento.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
