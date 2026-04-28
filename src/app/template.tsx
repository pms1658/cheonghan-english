'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function Template({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        setVisible(false);
        // Double rAF to guarantee the browser paints opacity:0 first
        // (defeats React 18 automatic batching)
        const frame1 = requestAnimationFrame(() => {
            const frame2 = requestAnimationFrame(() => setVisible(true));
            return () => cancelAnimationFrame(frame2);
        });
        return () => cancelAnimationFrame(frame1);
    }, [pathname]);

    return (
        <div
            style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(6px)',
                transition: 'opacity 0.25s ease-out, transform 0.3s ease-out',
            }}
        >
            {children}
        </div>
    );
}
