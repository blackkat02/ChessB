import { Link, NavLink } from 'react-router-dom';
import clsx from 'clsx';

const linkClass = ({ isActive }) =>
  clsx(
    'rounded-md px-3 py-1.5 text-sm font-medium transition',
    isActive
      ? 'bg-brand/10 text-brand'
      : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
  );

const Navigation = () => {
  return (
    <header className="border-b border-neutral-200 bg-white/80 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link to="/" className="text-xl font-extrabold tracking-tight text-neutral-900">
          Chess<span className="text-brand">B</span>
        </Link>
        <ul className="flex gap-1">
          <li>
            <NavLink to="/" end className={linkClass}>
              Home
            </NavLink>
          </li>
          <li>
            <NavLink to="/sandbox" className={linkClass}>
              SandBox
            </NavLink>
          </li>
        </ul>
      </nav>
    </header>
  );
};

export default Navigation;
