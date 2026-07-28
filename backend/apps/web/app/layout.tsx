import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Loreloom",
  description: "Persistent AI Art Director agent for story canon."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
