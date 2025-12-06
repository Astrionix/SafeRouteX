import './globals.css';
import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
    title: 'SafeRouteX - Navigate Safely',
    description: 'Find the safest routes using real-time crime data, CCTV locations, and streetlight density',
    keywords: 'safe navigation, crime map, safety routes, CCTV, streetlights, SOS',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className="antialiased">
                {children}
                <Toaster
                    position="top-right"
                    toastOptions={{
                        className: 'toast-custom',
                        duration: 4000,
                        style: {
                            background: '#1e293b',
                            color: '#f1f5f9',
                            border: '1px solid rgba(255,255,255,0.1)',
                        },
                    }}
                />
            </body>
        </html>
    );
}
