import React from 'react';

interface ButtonProps {
    children: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    onClick?: () => void;
    className?: string;
    icon?: React.ComponentType<{ size?: number }>;
}

const Button = ({
    children,
    variant = 'primary',
    onClick,
    className = "",
    icon: Icon
}: ButtonProps) => {
    const base = "inline-flex items-center justify-center font-bold transition-all active:scale-[0.98] rounded-lg disabled:opacity-50";

    const variants: Record<string, string> = {
        primary: "btn-primary hover:bg-orange-600 shadow-sm shadow-orange-200 dark:shadow-orange-900/20",
        secondary: "bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200",
        outline: "border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-600 text-slate-700 dark:text-slate-400",
        ghost: "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800",
    };

    return (
        <button onClick={onClick} className={`${base} ${variants[variant]} px-4 py-2 text-xs gap-2 ${className}`}>
            {Icon && <Icon size={14} />}
            {children}
        </button>
    );
};

export default Button;
