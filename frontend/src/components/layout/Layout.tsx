import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

interface LayoutProps {
    children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
    return (
        <div className="min-h-screen bg-dark-950">
            <Sidebar />
            <div className="ml-[280px] transition-all duration-300">
                <Header />
                <main className="p-6 min-h-[calc(100vh-64px)]">
                    {children}
                </main>
            </div>
        </div>
    );
}
