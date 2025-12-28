import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "@/components/AppProviders";
import ClientWrapper from "@/components/ClientWrapper";
import { Header } from "@/components/Header";
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
            <Header />
            <div className="flex">
              <Sidebar />
              <main className="flex-1 lg:ml-64">
                {children}
              </main>
            </div>
          </ClientWrapper>
        </AppProviders>
      </body>
    </html>
  );
}