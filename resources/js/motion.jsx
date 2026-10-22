import { AnimatePresence, motion } from 'framer-motion';

const ease = [0.22, 1, 0.36, 1];

export const fadeUp = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease } },
};

export const stagger = (gap = 0.05, delay = 0) => ({
    hidden: {},
    show: { transition: { staggerChildren: gap, delayChildren: delay } },
});

export function PageTransition({ children, className = '' }) {
    return (
        <motion.div
            className={className}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease }}
        >
            {children}
        </motion.div>
    );
}

export function Popover({ open, className = 'menu-pop', children, ...rest }) {
    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className={className}
                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.97 }}
                    transition={{ duration: 0.16, ease }}
                    {...rest}
                >
                    {children}
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export { AnimatePresence, motion };
