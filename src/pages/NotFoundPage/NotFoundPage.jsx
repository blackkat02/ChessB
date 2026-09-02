import { Link } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-error-page p-5 font-ui">
      <div className="w-full max-w-xl rounded-card bg-error-surface p-10 text-center shadow-btn">
        <h1 className="text-8xl font-bold leading-none text-error-code sm:text-9xl">
          404
        </h1>
        <h2 className="mt-5 text-2xl font-semibold text-fg sm:text-3xl">
          Сторінку не знайдено
        </h2>
        <p className="mb-8 mt-3 text-fg-muted">
          На жаль, сторінка, яку ви шукаєте, не існує або була видалена.
        </p>
        <Link
          to="/"
          className="inline-block rounded-control bg-btn-primary px-6 py-3 font-medium text-btn-primary-fg transition hover:brightness-110"
        >
          Повернутись на головну
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
