import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SupportChat from '@/components/SupportChat';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Sallapuradamma textiles - Premium Fashion Store',
  description: 'Shop the latest dress collections for every occasion',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <CartProvider>
            <Navbar />
            <main className="min-h-screen">{children}</main>
            <Footer />
            <SupportChat />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
