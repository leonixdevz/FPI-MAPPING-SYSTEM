import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';

export function Layout() {
  const { pathname } = useLocation();
  // The map page is full-viewport; the footer would force a page scroll.
  const hideFooter = pathname.startsWith('/map');

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      {hideFooter ? null : <Footer />}
    </div>
  );
}
