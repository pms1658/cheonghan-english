import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: '청한영어',
        short_name: '청한영어',
        description: '구조가 보이면 영어가 보인다. 청한영어 학생용 앱',
        start_url: '/',
        display: 'standalone',
        background_color: '#0A0E27',
        theme_color: '#0A0E27',
        icons: [
            {
                src: '/logo_final.png',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: '/logo_final.png',
                sizes: '512x512',
                type: 'image/png',
            },
            {
                src: '/logo_final.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
            },
            {
                src: '/logo.svg',
                sizes: 'any',
                type: 'image/svg+xml',
            },
        ],
    };
}
