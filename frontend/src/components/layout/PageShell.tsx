import React from 'react';
import { Header } from './Header';
import { Footer } from './Footer';

interface PageShellProps {
  children: React.ReactNode;
  title?: string;
}

export const PageShell: React.FC<PageShellProps> = ({ children, title }) => {
  React.useEffect(() => {
    if (title) {
      document.title = `${title} — CiviSight AI`;
    }
  }, [title]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main id="main-content" className="flex-1" tabIndex={-1}>
        {children}
      </main>
      <Footer />
    </div>
  );
};
