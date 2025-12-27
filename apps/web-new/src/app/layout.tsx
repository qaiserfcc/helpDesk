import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "@/components/AppProviders";
import ClientWrapper from "@/components/ClientWrapper";
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
              <main className="flex-1 lg:ml-64">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                  {children}
                </div>
              </main>
            </div>
          </ClientWrapper>
        </AppProviders>
      </body>
    </html>
  );
}