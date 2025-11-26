import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "@/components/AppProviders";
import ClientWrapper from "@/components/ClientWrapper";

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
            {children}
          </ClientWrapper>
        </AppProviders>
      </body>
    </html>
  );
}