import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ціни на пальне в Україні",
  description: "Середні ціни на бензин, дизель і газ в Україні та Київській області, порівняння мереж АЗС і динаміка за період.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="uk">
      <body>{children}</body>
    </html>
  );
}
