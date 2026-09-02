import clsx from 'clsx';

const VARIANTS = {
  default:
    'bg-btn-default text-btn-default-fg border-btn-default-border hover:bg-btn-default-hover',
  primary: 'bg-btn-primary text-btn-primary-fg border-transparent hover:brightness-110',
  danger: 'bg-btn-danger text-btn-danger-fg border-transparent hover:brightness-110',
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
        'inline-flex items-center justify-center rounded-control border px-5 py-2.5',
        'font-ui text-sm font-semibold shadow-btn transition active:scale-95',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-btn-focus',
        VARIANTS[variant] ?? VARIANTS.default,
        className
      )}
    >
      {children}
    </button>
  );
};

export default Button;
