import type { Metadata } from 'next';
import { PT_Sans, Playfair_Display } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import NoSSR from '@/components/NoSSR';
import { ThemeProvider } from '@/components/theme-provider';
import { Analytics } from '@vercel/analytics/react';

const ptSans = PT_Sans({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-pt-sans',
});

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair-display',
});


export const metadata: Metadata = {
  title: 'LoanZen - Global Loan Calculator & Tracker',
  description: 'Calculate, track, and optimize your loans with LoanZen. Get AI-powered advice to pay off your debt faster.',
  // Next.js automatically detects favicon.ico, icon.png, and apple-icon.png in the app directory
  // We only need to specify the manifest for PWA support
  manifest: '/site.webmanifest',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${ptSans.variable} ${playfairDisplay.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Aggressive cleanup of browser extension attributes
              (function() {
                const extensionAttrs = ['bis_register', '__processed_', 'bis_skin_checked', 'data-bis-*'];
                
                function removeExtensionAttrs() {
                  const allElements = document.querySelectorAll('*');
                  allElements.forEach(el => {
                    if (el instanceof HTMLElement) {
                      extensionAttrs.forEach(attr => {
                        if (el.hasAttribute(attr)) {
                          el.removeAttribute(attr);
                        }
                      });
                      // Remove any attribute starting with bis_ or __processed
                      Array.from(el.attributes).forEach(attr => {
                        if (attr.name.startsWith('bis_') || attr.name.startsWith('__processed')) {
                          el.removeAttribute(attr.name);
                        }
                      });
                    }
                  });
                }
                
                // Run immediately
                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', removeExtensionAttrs);
                } else {
                  removeExtensionAttrs();
                }
                
                // Run on every mutation
                const observer = new MutationObserver(removeExtensionAttrs);
                observer.observe(document.documentElement, { 
                  attributes: true, 
                  childList: true, 
                  subtree: true,
                  attributeFilter: ['bis_skin_checked', 'bis_register', '__processed_']
                });
                
                // Run periodically as backup
                setInterval(removeExtensionAttrs, 100);
              })();
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <FirebaseClientProvider>
            <NoSSR>
              <div className="flex flex-col min-h-screen">
                <Header />
                <main className="flex-grow">{children}</main>
                <Footer />
              </div>
            </NoSSR>
            <Toaster />
          </FirebaseClientProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
