import type { Metadata } from "next";
import { Libre_Franklin, Playfair_Display, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";
import { getDesignTheme } from "@/lib/config";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  style: ["normal", "italic"],
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const libre = Libre_Franklin({
  variable: "--font-libre",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "My World News",
  description: "A configurable world news aggregator",
};

const themeScript = `
(function () {
  try {
    var design = localStorage.getItem("newsflow-design") || "broadsheet";
    document.documentElement.setAttribute("data-theme", design);
    var stored = localStorage.getItem("newsflow-theme");
    var dark = stored === "dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (dark) document.documentElement.classList.add("dark");
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const designTheme = getDesignTheme();

  return (
    <html
      lang="en"
      data-theme={designTheme}
      className={`${playfair.variable} ${sourceSerif.variable} ${libre.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className="min-h-full flex flex-col bg-background text-foreground font-serif"
        suppressHydrationWarning
      >
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
