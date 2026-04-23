'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function Template({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        setVisible(false);
        // Tiny delay to trigger CSS transition
        const t = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(t);
    }, [pathname]);

    return (
        <div
            style={{
                opacity: visible ? 1 : 0,
                transition: 'opacity 0.15s ease-in-out',
            }}
        >
            {children}
        </div>
    );
}
