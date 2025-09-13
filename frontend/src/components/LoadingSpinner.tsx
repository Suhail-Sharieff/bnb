import React from 'react';
import { cn } from '../lib/utils';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
  color?: 'primary' | 'secondary' | 'white';
}

const sizeClasses = {
  small: 'h-4 w-4',
  medium: 'h-8 w-8',
  large: 'h-16 w-16'
};

const colorClasses = {
  primary: 'text-blue-600',
  secondary: 'text-gray-600',
  white: 'text-white'
};

export default function LoadingSpinner({ 
  size = 'medium', 
  className, 
  color = 'primary' 
}: LoadingSpinnerProps) {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div 
        className={cn(
          'animate-spin rounded-full border-2 border-transparent border-t-current',
          sizeClasses[size],
          colorClasses[color]
        )}
      >
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  );
}