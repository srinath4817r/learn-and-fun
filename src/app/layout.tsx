import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/lf/theme-provider";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Learn & Fun — Learn Something. Share Something. Have Fun.",
  description:
    "The peer-to-peer skill exchange platform for college students. Discover students who can teach what you want to learn, share the skills you already know, and build meaningful connections.",
  keywords: ["peer learning", "skill exchange", "students", "college", "learn and fun"],
  authors: [{ name: "Learn & Fun" }],
  icons: { icon: "/logo.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${poppins.variable} antialiased bg-background text-foreground min-h-screen flex flex-col`}
      >
        <ThemeProvider>
          <div className="lf-ambient flex flex-col min-h-screen w-full">
            {children}
          </div>
          <Toaster position="top-right" theme="system" />
        </ThemeProvider>
      </body>
    </html>
  );
}
