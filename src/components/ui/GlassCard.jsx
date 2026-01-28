import React from 'react';

const GlassCard = ({ children, className = '', hoverEffect = false, ...props }) => {
    return (
        <div
            className={`
        glass-card
        bg-background-surface/40 
        ${hoverEffect ? 'hover:bg-background-surface/60 cursor-pointer' : ''}
        ${className}
      `}
            {...props}
        >
            {children}
        </div>
    );
};

export default GlassCard;
