import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { ConvexClientProvider } from "@/components/convex-client-provider";
import { BannerProvider } from "@/app/(pages)/components/BannerContext";
import { BannerContainer } from "@/app/(pages)/components/BannerContainer";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import Script from "next/script";

export const metadata: Metadata = {
  title: "DocTask",
  description: "A Collaborative Documentation and Management Desktop App",
  icons: {
    icon: "/doctask.webp",
  },
};

const inter = Inter({
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Google tag (gtag.js) */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-FRHNS1CELR"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-FRHNS1CELR');
          `}
        </Script>
      </head>
      <body className={inter.className}>
        <NuqsAdapter>
          <ConvexClientProvider>
            <BannerProvider>
              {children}
              <BannerContainer />
            </BannerProvider>
          </ConvexClientProvider>
        </NuqsAdapter>
        <SpeedInsights />
      </body>
    </html>
  );
}
