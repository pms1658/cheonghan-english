'use client';

import { useState, useEffect } from 'react';
import { dbService } from '@/services/db';
import { Post } from '@/types';

export default function LatestNewsSection() {
    const [posts, setPosts] = useState<Post[]>([]);

    useEffect(() => {
        const load = async () => {
            const data = await dbService.getPosts('blog');
            // Take top 3
            setPosts(data.slice(0, 3));
        };
        load();
    }, []);

    if (posts.length === 0) return null;

    return (
        <section className="py-20 px-6 bg-slate-50 border-t border-slate-200">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-end mb-12">
                    <div>
                        <span className="text-blue-600 font-bold tracking-wider uppercase text-sm">Latest News</span>
                        <h2 className="text-3xl font-bold text-slate-900 mt-2">청한영어 소식</h2>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {posts.map(post => (
                        <a
                            key={post.id}
                            href={post.url}
                            target="_blank"
                            rel="noreferrer"
                            className="group block bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-slate-100 hover:border-blue-100 transform hover:-translate-y-1"
                        >
                            <div className="aspect-video bg-slate-100 relative overflow-hidden flex items-center justify-center">
                                {/* Placeholder since we don't have thumbnails yet */}
                                <div className="absolute inset-0 bg-gradient-to-tr from-slate-200 to-slate-100 group-hover:scale-105 transition-transform duration-500"></div>
                                <span className="relative text-4xl transform group-hover:scale-110 transition-transform duration-300">📢</span>

                                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-slate-500">
                                    BLOG
                                </div>
                            </div>
                            <div className="p-6">
                                <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-2 mb-3">
                                    {post.title}
                                </h3>
                                <div className="flex justify-between items-center text-xs text-slate-400">
                                    <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                                    <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                        자세히 보기 &rarr;
                                    </span>
                                </div>
                            </div>
                        </a>
                    ))}
                </div>
            </div>
        </section>
    );
}
