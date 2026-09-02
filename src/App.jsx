import { Route, Routes } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import MainLayout from './layouts/MainLayout/MainLayout';

const HomePage = lazy(() => import('./pages/HomePage/HomePage'));
const SandBoxPage = lazy(() => import('./pages/SandBoxPage/SandBoxPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage/NotFoundPage'));

function App() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center font-ui text-fg-muted">
          Завантаження сторінки...
        </div>
      }
    >
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<HomePage />} />
          <Route path="sandbox" element={<SandBoxPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

export default App;
