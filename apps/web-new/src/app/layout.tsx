import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "@/components/AppProviders";
import ClientWrapper from "@/components/ClientWrapper";
import { Header } from "@/components/Header";
import { GlobalModals } from "@/components/GlobalModals";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "HelpDesk",
  description: "HelpDesk Web App",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AppProviders>
          <ClientWrapper>
            <div className="flex min-h-screen">
              <Sidebar />
              <div className="flex-1 flex flex-col">
                <Header />
                <div className="flex-1">{children}</div>
              </div>
            </div>
            <GlobalModals />
          </ClientWrapper>
        </AppProviders>
      </body>
    </html>
  );
}