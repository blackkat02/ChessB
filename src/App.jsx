import { Route, Routes } from "react-router-dom";
import MainLayout from './layouts/MainLayout/MainLayout';
import { lazy, Suspense, React } from "react";

const HomePage = lazy(() => import("./pages/HomePage/HomePage"));
const SandBoxPage = lazy(() => import("./pages/SandBoxPage/SandBoxPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage/NotFoundPage"));
import style from './App.module.css';

function App() {
  return (
    <div className={style.appContainer}>
      <Suspense fallback={<div>Завантаження сторінки...</div>}>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<HomePage />} />
            <Route path="/sandbox" element={<SandBoxPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </div>
  );
}

export default App;