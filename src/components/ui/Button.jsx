import React from 'react';

const Button = ({
    children,
    variant = 'primary',
    size = 'md',
    className = '',
    isLoading = false,
    ...props
}) => {
    const baseStyles = 'btn-new relative overflow-hidden';

    const variants = {
        primary: 'btn-primary-glow',
        ghost: 'btn-ghost-glow',
        outline: 'btn-ghost-glow border-white/10 hover:border-primary/50',
        danger: 'bg-destructive text-white hover:bg-destructive/90 shadow-lg shadow-destructive/20',
    };

    const sizes = {
        sm: 'text-xs px-3 py-2',
        md: 'text-sm px-5 py-3',
        lg: 'text-base px-8 py-4',
        icon: 'p-3',
    };

    return (
        <button
            className={`
        ${baseStyles}
        ${variants[variant] || variants.primary}
        ${sizes[size] || sizes.md}
        ${className}
      `}
            disabled={isLoading || props.disabled}
            {...props}
        >
            {isLoading && (
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            {children}
        </button>
    );
};

export default Button;
