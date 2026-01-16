import React from 'react';

interface CardProps {
    children: React.ReactNode;
    title?: string;
    subtitle?: string;
    action?: React.ReactNode;
    className?: string;
}

const Card = ({
    children,
    title,
    subtitle,
    action,
    className = ""
}: CardProps) => (
    <div className={`professional-card bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none rounded-xl overflow-hidden ${className}`}>
        {(title || action) && (
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/30">
                <div>
                    {title && <h3 className="card-title text-sm text-slate-900 dark:text-slate-100 tracking-tight">{title}</h3>}
                    {subtitle && <p className="card-sub text-[10px] uppercase tracking-wider mt-0.5 text-slate-500 dark:text-slate-400">{subtitle}</p>}
                </div>
                {action && <div>{action}</div>}
            </div>
        )}
        <div className="p-6">{children}</div>
    </div>
);

export default Card;
