"use client";

import { usePathname } from "next/navigation";
import { PageTransition } from "@/components/ui/page-transition";

export default function Template({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    // Define paths where the video loader should play
    const showLoaderPaths = [
        "/",                // Landing page
        "/login",           // Auth
        "/signup",          // Auth
        "/forgot-password"  // Auth
    ];

    // Check if current path starts with any of the allowed paths
    // Using startsWith to cover sub-routes like /login/verify if they exist
    // But strict equality for "/" to avoid matching everything
    const shouldShowLoader = showLoaderPaths.some((path) => {
        if (path === "/") return pathname === "/";
        return pathname.startsWith(path);
    });

    if (shouldShowLoader) {
        return <PageTransition>{children}</PageTransition>;
    }

    return <>{children}</>;
}
