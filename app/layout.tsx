import type { Metadata } from "next";
//import { Geist, Geist_Mono } from "next/font/google";
import StatusAlert from "@/components/ui/StatusAlert";
import localFont from "next/font/local";
import "./globals.css";

const myFont = localFont({
  src: "./fonts/HelveticaNeue-Regular.otf"
});

export const metadata: Metadata = {
  title: "Suara MIPA",
  description: "Sebuah one-stop platform untuk FMIPA yang lebih UNGGUL",
  icons: { icon: "/favicon.ico", shortcut: "/favicon.ico" }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${myFont.className} antialiased`}
        suppressHydrationWarning
      >
        <StatusAlert></StatusAlert>
        <main>{children}</main>
      </body>
    </html>
  );
}
