import type { Metadata } from "next";
import { Public_Sans, IBM_Plex_Mono } from "next/font/google";
import { Providers } from "@/lib/query-client";
import "./globals.css";

/**
 * Fonts (antislop R-16 requires a stated reason; AI-default picks Inter / Geist /
 * Space Grotesk for sans and Geist Mono / JetBrains Mono / Fira Code for mono are
 * deliberately avoided):
 *
 * - Public Sans for UI: a humanist sans whose slightly squarish letterforms read
 *   as "institutional and trustworthy" without being as generic as Inter. It
 *   holds up at the small sizes a dense ledger uses for labels.
 * - IBM Plex Mono for money: a mono with honest tabular figures, so columns of
 *   amounts line up and can be scanned and compared. Its slightly technical tone
 *   suits a ledger without resorting to "terminal" aesthetics.
 */
const uiSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-ui-sans",
  display: "swap",
});

const uiMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ui-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "LedgerFlow",
    template: "%s | LedgerFlow",
  },
  description: "A transaction ledger for finance operators.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${uiSans.variable} ${uiMono.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
