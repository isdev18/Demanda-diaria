import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Demanda Diária | Gestão Operacional",
  description:
    "Produção em foco, todos os dias. Acompanhe atividades, equipes e resultados da sua unidade de produção.",
  icons: {
    icon: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/demanda_diaria_icone_app-z8DeanHHC4RWjh547im26U9faBiJJN.png",
  },
};
export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#071f31",
  width: "device-width",
  initialScale: 1,
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  );
}
