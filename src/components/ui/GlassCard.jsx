import React from 'react';
import { motion } from 'framer-motion';
import { cardHover } from '../../utils/animations';

const GlassCard = ({ children, className = '', hoverEffect = true, delay = 0, ...props }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: delay, ease: [0.16, 1, 0.3, 1] }}
            variants={hoverEffect ? cardHover : undefined}
            whileHover={hoverEffect ? "hover" : undefined}
            whileTap={hoverEffect ? "tap" : undefined}
            className={`
        glass-card
        ${hoverEffect ? 'cursor-pointer' : ''}
        ${className}
      `}
            {...props}
        >
            {children}
        </motion.div>
    );
};

export default GlassCard;
