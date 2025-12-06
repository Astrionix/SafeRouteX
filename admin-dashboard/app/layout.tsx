import './globals.css';
import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
    title: 'SafeRouteX Admin Dashboard',
    description: 'Police & Admin Dashboard for SafeRouteX',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body className="antialiased">
                {children}
                <Toaster position="top-right" toastOptions={{
                    style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.1)' }
                }} />
            </body>
        </html>
    );
}
