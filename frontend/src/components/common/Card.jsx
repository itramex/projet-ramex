import { memo } from 'react';
import Icon from './Icon';

const Card = memo(({
  children,
  title,
  subtitle,
  icon,
  actions,
  className = '',
  padding = 'md',  // 'sm', 'md', 'lg', 'none'
  ...props
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  return (
    <div 
      className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}
      {...props}
    >
      {(title || icon || actions) && (
        <div className={`flex items-center justify-between border-b border-gray-200 ${paddingClasses[padding]}`}>
          <div className="flex items-center gap-3">
            {icon && <Icon name={icon} size="lg" className="text-gray-600" />}
            <div>
              {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
              {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={paddingClasses[padding]}>
        {children}
      </div>
    </div>
  );
});

Card.displayName = 'Card';

export default Card;
