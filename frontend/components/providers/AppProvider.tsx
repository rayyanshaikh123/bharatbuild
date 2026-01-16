'use client';

import React, { createContext, useContext, useState } from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

type Role = 'OWNER' | 'MANAGER';

interface AppContextType {
    role: Role | null;
    setRole: (r: Role | null) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
    const [role, setRole] = useState<Role | null>(null);

    return (
        <NextThemesProvider attribute="class" defaultTheme="system" enableSystem storageKey="theme">
            <AppContext.Provider value={{ role, setRole }}>
                {children}
            </AppContext.Provider>
        </NextThemesProvider>
    );
};

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};
