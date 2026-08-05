import { memo } from 'react';
import * as HeroIcons from '@heroicons/react/24/outline';
import * as HeroIconsSolid from '@heroicons/react/24/solid';

const Icon = memo(({ 
  name,           // Nom de l'icône (ex: 'ChartBarIcon')
  variant = 'outline',  // 'outline' ou 'solid'
  size = 'md',    // 'sm' (16px), 'md' (20px), 'lg' (24px), 'xl' (32px)
  className = '',
  ...props 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8'
  };

  const IconComponent = variant === 'solid' 
    ? HeroIconsSolid[name] 
    : HeroIcons[name];

  if (!IconComponent) {
    console.warn(`Icon "${name}" not found`);
    return null;
  }

  return (
    <IconComponent 
      className={`${sizeClasses[size]} ${className}`}
      {...props}
    />
  );
});

Icon.displayName = 'Icon';

export default Icon;
