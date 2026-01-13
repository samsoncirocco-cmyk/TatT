import { motion } from 'framer-motion';

const Card = ({ children, className = '', hover = false, ...props }) => {
    return (
        <motion.div
            whileHover={hover ? { y: -5, boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5)' } : {}}
            className={`
        glass-panel p-6 rounded-2xl relative overflow-hidden
        ${className}
      `}
            {...props}
        >
            {/* Glossy sheen effect */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            {children}
        </motion.div>
    );
};

export default Card;
