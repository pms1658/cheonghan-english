'use client';

import { useEffect, useRef, useState, ReactNode } from 'react';

interface ScrollRevealProps {
    children: ReactNode;
    className?: string;
    delay?: number; // ms
    direction?: 'up' | 'left' | 'right' | 'scale';
}

export default function ScrollReveal({ 
    children, 
    className = '', 
    delay = 0,
    direction = 'up' 
}: ScrollRevealProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.unobserve(entry.target);
                }
            },
            { threshold: 0.15, rootMargin: '0px 0px -50px 0px' }
        );

        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);

    const transforms: Record<string, string> = {
        up: 'translateY(40px)',
        left: 'translateX(-40px)',
        right: 'translateX(40px)',
        scale: 'scale(0.92)',
    };

    return (
        <div
            ref={ref}
            className={className}
            style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'none' : transforms[direction],
                transition: `opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
                willChange: 'opacity, transform',
            }}
        >
            {children}
        </div>
    );
}
