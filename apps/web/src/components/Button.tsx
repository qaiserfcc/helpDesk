import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'alt'
  size?: 'small' | 'medium' | 'large'
}

export default function Button({ variant = 'primary', size = 'medium', className = '', ...props }: ButtonProps) {
  const baseClasses = 'cta'
  const variantClasses = {
    primary: '',
    secondary: 'alt',
    alt: 'alt'
  }
  const sizeClasses = {
    small: 'small',
    medium: '',
    large: 'large'
  }

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    />
  )
}