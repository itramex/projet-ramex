import { memo } from 'react';
import Icon from './Icon';

const Badge = memo(({
  children,
  variant = 'neutral',  // 'success', 'error', 'warning', 'info', 'neutral'
  size = 'md',          // 'sm', 'md', 'lg'
  icon,
  className = '',
  ...props
}) => {
  const variantClasses = {
    success: 'bg-green-50 text-green-700 border-green-200',
    error: 'bg-red-50 text-red-700 border-red-200',
    warning: 'bg-orange-50 text-orange-700 border-orange-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    neutral: 'bg-gray-50 text-gray-700 border-gray-200'
  };
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-2.5 py-1 text-sm gap-1.5',
    lg: 'px-3 py-1.5 text-base gap-2'
  };

  return (
    <span 
      className={`inline-flex items-center font-medium rounded-full border ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {icon && <Icon name={icon} size="sm" />}
      {children}
    </span>
  );
});

Badge.displayName = 'Badge';

export default Badge;
