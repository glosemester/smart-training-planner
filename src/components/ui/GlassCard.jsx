import React from 'react';

const GlassCard = ({ children, className = '', hoverEffect = false, ...props }) => {
    return (
        <div
            className={`
        glass-card
        ${hoverEffect ? 'hover:scale-[1.02] cursor-pointer' : ''}
        ${className}
      `}
            {...props}
        >
            {children}
        </div>
    );
};

export default GlassCard;
