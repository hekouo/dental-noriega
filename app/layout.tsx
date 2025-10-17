import "./globals.css";
export const metadata = {
  title: "Depósito Dental Noriega",
  description: "Marketplace dental — destacados y consulta por WhatsApp",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-gray-50 antialiased min-h-screen bg-gray-50 antialiased min-h-screen bg-gray-50 antialiased">
        {children}
      </body>
    </html>
  );
}
