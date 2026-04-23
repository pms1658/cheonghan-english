'use client';

import React, { useRef, useEffect } from 'react';

interface RichTextEditorProps {
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
    className?: string;
}

export default function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
    const editorRef = useRef<HTMLDivElement>(null);

    // Initial value setup
    // We only set innerHTML if the editor is empty or on mount to avoid cursor jumping
    // However, for simplicity in this constrained environment, we'll carefuly manage it.
    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            // Only update if significantly different to prevent loop/cursor loss
            // Simple check: if empty value, clear editor.
            if (value === '') editorRef.current.innerHTML = '';
            // If mounting with content
            if (editorRef.current.innerHTML === '' && value) {
                editorRef.current.innerHTML = value;
            }
        }
    }, [value]);

    const handleInput = () => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    const exec = (command: string, value: string | undefined = undefined) => {
        document.execCommand(command, false, value);
        if (editorRef.current) editorRef.current.focus();
    };

    const ToolbarButton = ({
        cmd, arg, icon, active = false
    }: { cmd: string, arg?: string, icon: React.ReactNode, active?: boolean }) => (
        <button
            type="button"
            onMouseDown={(e) => {
                e.preventDefault(); // Prevent focus loss
                exec(cmd, arg);
            }}
            className={`p-2 rounded hover:bg-slate-100 text-slate-600 transition-colors ${active ? 'bg-slate-200 text-blue-600' : ''}`}
        >
            {icon}
        </button>
    );

    return (
        <div className={`border border-slate-200 rounded-xl overflow-hidden bg-white ${className}`}>
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-1 p-2 border-b border-slate-100 bg-slate-50">
                {/* Font Size */}
                <select
                    onChange={(e) => exec('fontSize', e.target.value)}
                    className="p-1.5 rounded border border-slate-200 text-sm bg-white text-slate-700 outline-none focus:ring-1 focus:ring-blue-500"
                    defaultValue="3"
                >
                    <option value="1">작게</option>
                    <option value="3">보통</option>
                    <option value="5">크게</option>
                    <option value="7">아주 크게</option>
                </select>

                <div className="w-px h-6 bg-slate-300 mx-1"></div>

                {/* Bold */}
                <ToolbarButton cmd="bold" icon={<strong className="font-bold serif">B</strong>} />
                {/* Italic */}
                <ToolbarButton cmd="italic" icon={<em className="italic serif">I</em>} />
                {/* Underline */}
                <ToolbarButton cmd="underline" icon={<span className="underline serif">U</span>} />

                <div className="w-px h-6 bg-slate-300 mx-1"></div>

                {/* Align */}
                <ToolbarButton cmd="justifyLeft" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h10M4 18h16"></path></svg>} />
                <ToolbarButton cmd="justifyCenter" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M7 12h10M4 18h16"></path></svg>} />
                <ToolbarButton cmd="justifyRight" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M10 12h10M4 18h16"></path></svg>} />

                <div className="w-px h-6 bg-slate-300 mx-1"></div>

                {/* Color */}
                <div className="relative flex items-center">
                    <label className="flex items-center justify-center p-1.5 rounded hover:bg-slate-100 cursor-pointer">
                        <input
                            type="color"
                            className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                            onChange={(e) => exec('foreColor', e.target.value)}
                        />
                        <span className="w-4 h-4 rounded-full bg-gradient-to-br from-red-500 via-green-500 to-blue-500 border border-slate-200 shadow-sm"></span>
                    </label>
                </div>
            </div>

            {/* Editor Area */}
            <div
                ref={editorRef}
                contentEditable
                onInput={handleInput}
                className="p-4 min-h-[300px] outline-none text-slate-800 leading-relaxed text-base"
                style={{ minHeight: '300px' }}
            />
            {(!editorRef.current?.innerHTML && placeholder) && (
                <div className="absolute top-[60px] left-4 text-slate-400 pointer-events-none">
                    {placeholder}
                </div>
            )}
        </div>
    );
}
