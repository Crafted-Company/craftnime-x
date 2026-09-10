import React from 'react';
import logoImg from '../../assets/Craftnime.png';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', className = '' }) => {
  const iconSizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl sm:text-2xl',
    lg: 'text-2xl sm:text-3xl',
  };

  return (
    <div className={`flex items-center gap-3 cursor-pointer select-none group ${className}`}>
      {/* Official Crafted Co. Brand Logo with no bottom glow */}
      <img
        src={logoImg}
        alt="Craftnime Logo"
        className={`${iconSizes[size]} object-contain rounded-xl transition-transform group-hover:scale-105 shrink-0`}
      />

      {/* Brand Title with clean, crisp typography and no glow */}
      <span className={`${textSizes[size]} font-bold tracking-tight text-white flex items-center`}>
        Craft<span className="text-crafted-brand-rustLight font-bold">nime</span>
      </span>
    </div>
  );
};
