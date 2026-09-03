import { Outlet } from 'react-router-dom';
import Navigation from '../../components/Navigation/Navigation';

const MainLayout = () => {
  return (
    <div className="min-h-screen bg-page">
      <Navigation />
      <main className="mx-auto max-w-5xl px-4">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
