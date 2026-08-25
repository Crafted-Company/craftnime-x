import React from 'react';

interface BadgeProps {
  variant?: 'rust' | 'violet' | 'surface' | 'gold' | 'emerald' | 'outline';
  size?: 'xs' | 'sm' | 'md';
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'surface',
  size = 'sm',
  children,
  className = '',
  icon,
}) => {
  const variantStyles = {
    rust: 'bg-crafted-brand-rust/20 text-crafted-brand-rustLight border-crafted-brand-rust/40',
    violet: 'bg-crafted-brand-lightViolet/15 text-crafted-brand-lightViolet border-crafted-brand-lightViolet/30',
    surface: 'bg-crafted-surface text-crafted-text-muted border-crafted-border',
    gold: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    outline: 'bg-transparent text-crafted-text border-crafted-border hover:border-crafted-border-bright',
  };

  const sizeStyles = {
    xs: 'text-[10px] px-1.5 py-0.5 rounded font-mono',
    sm: 'text-xs px-2 py-0.5 rounded-md font-mono',
    md: 'text-sm px-2.5 py-1 rounded-md font-mono',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium border uppercase tracking-wider backdrop-blur-sm ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {icon && <span className="opacity-80">{icon}</span>}
      {children}
    </span>
  );
};
