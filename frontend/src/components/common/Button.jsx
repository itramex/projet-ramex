import { memo } from 'react';
import Icon from './Icon';

const Button = memo(({
  children,
  variant = 'primary',  // 'primary', 'secondary', 'ghost', 'danger'
  size = 'md',          // 'sm', 'md', 'lg'
  icon,                 // Nom de l'icône
  iconPosition = 'left', // 'left' ou 'right'
  loading = false,
  disabled = false,
  className = '',
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantClasses = {
    primary: 'bg-chick-yellow text-gray-900 hover:bg-yellow-500 focus:ring-yellow-400',
    secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-gray-400',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-400',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-base gap-2',
    lg: 'px-6 py-3 text-lg gap-2.5'
  };
  
  const iconSizes = {
    sm: 'sm',
    md: 'md',
    lg: 'lg'
  };

  // Si className contient des classes de couleur personnalisées, ne pas appliquer les classes de variant
  const hasCustomColors = className && (
    className.includes('text-') || 
    className.includes('bg-') || 
    className.includes('border-')
  );
  
  return (
    <button
      className={`${baseClasses} ${!hasCustomColors ? variantClasses[variant] : ''} ${sizeClasses[size]} ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <Icon name="ArrowPathIcon" size={iconSizes[size]} className="animate-spin" />
      )}
      {!loading && icon && iconPosition === 'left' && (
        <Icon name={icon} size={iconSizes[size]} />
      )}
      {children}
      {!loading && icon && iconPosition === 'right' && (
        <Icon name={icon} size={iconSizes[size]} />
      )}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
