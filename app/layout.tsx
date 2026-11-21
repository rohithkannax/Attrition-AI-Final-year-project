import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'AttritionAI - Employee Resignation Risk & Explanations',
  description: 'Predicts which employees are likely to resign, and explains the reason for each employee using the Gemini API.',
  openGraph: {
    title: 'AttritionAI - Employee Resignation Risk & Explanations',
    description: 'Predicts which employees are likely to resign, and explains the reason for each employee using the Gemini API.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AttritionAI - Employee Resignation Risk & Explanations',
    description: 'Predicts which employees are likely to resign, and explains the reason for each employee using the Gemini API.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
