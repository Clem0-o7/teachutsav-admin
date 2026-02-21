import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/providers/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: {
    default: "Techutsav Admin",
    template: "%s | Techutsav Admin",
  },
  description: "Official administration portal for Techutsav — manage events, registrations, payments, and more.",
  authors: [{ name: "Techutsav TCE" }],
  keywords: ["Techutsav", "admin", "dashboard", "events", "registrations"],
  robots: { index: false, follow: false },
  openGraph: {
    title: "Techutsav Admin",
    description: "Official administration portal for Techutsav.",
    siteName: "Techutsav Admin",
    type: "website",
  },
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
