import { Link, NavLink } from 'react-router-dom';
import clsx from 'clsx';

const linkClass = ({ isActive }) =>
  clsx(
    'rounded-md px-3 py-1.5 text-sm font-medium transition',
    isActive
      ? 'bg-nav-link-active-bg text-nav-link-active'
      : 'text-nav-link hover:bg-nav-link-hover-bg hover:text-nav-link-hover'
  );

const Navigation = () => {
  return (
    <header className="border-b border-nav-border bg-nav-bg font-ui backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link to="/" className="text-xl font-extrabold tracking-tight text-fg">
          Chess<span className="text-accent">B</span>
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
