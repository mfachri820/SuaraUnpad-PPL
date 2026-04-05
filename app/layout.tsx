import type { Metadata } from "next";
//import { Geist, Geist_Mono } from "next/font/google";
import Navbar from "@/components/ui/Navbar";
import Footer from "@/components/ui/Footer"; 
import localFont from "next/font/local";
import "./globals.css";

const myFont = localFont({
  src: "./fonts/HelveticaNeue-Regular.otf"
});

export const metadata: Metadata = {
  title: "SuaraUnpad",
  description: "Sebuah one-stop platform untuk Unpad yang lebih UNGGUL"
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
        <Navbar></Navbar>

        <main>{children}</main>

        <Footer></Footer>
      </body>
    </html>
  );
}
