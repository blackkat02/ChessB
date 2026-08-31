import clsx from 'clsx';

const VARIANTS = {
  default: 'bg-white text-gray-800 border-gray-300 hover:bg-gray-100',
  primary: 'bg-brand text-white border-transparent hover:brightness-110',
  danger: 'bg-danger text-white border-transparent hover:brightness-110',
};

const Button = ({
  onClick,
  children,
  type = 'button',
  variant = 'default',
  className = '',
  id,
}) => {
  return (
    <button
      onClick={onClick}
      type={type}
      id={id}
      className={clsx(
        'inline-flex items-center justify-center rounded-lg border px-5 py-2.5',
        'text-sm font-semibold shadow-sm transition active:scale-95',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
        VARIANTS[variant] ?? VARIANTS.default,
        className
      )}
    >
      {children}
    </button>
  );
};

export default Button;
