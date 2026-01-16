'use client';

import React, { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';

const ThemeToggle = () => {
    const [mounted, setMounted] = useState(false);
    const { theme, setTheme } = useTheme();

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 w-10 h-10" />
        );
    }

    const handleClick = () => {
        // cycle through light -> dark -> system
        if (theme === 'light') setTheme('dark');
        else if (theme === 'dark') setTheme('system');
        else setTheme('light');
    };

    const title = theme === 'light' ? 'Switch to dark' : theme === 'dark' ? 'Switch to system' : 'Switch to light';

    return (
        <button
            onClick={handleClick}
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-sm border border-slate-200 dark:border-slate-700"
            title={title}
            aria-label="Toggle color theme"
        >
            {theme === 'light' && <Moon size={18} />}
            {theme === 'dark' && <Sun size={18} />}
            {theme === 'system' && <Monitor size={18} />}
        </button>
    );
};

export default ThemeToggle;
