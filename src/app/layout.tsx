import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Đổi từ Geist sang Inter
import "./globals.css";

const inter = Inter({ subsets: ["latin"] }); // Khởi tạo font Inter

export const metadata: Metadata = {
  title: "License Manager",
  description: "Quản lý license nbox",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}> {/* Dùng font inter ở đây */}
        {children}
      </body>
    </html>
  );
}