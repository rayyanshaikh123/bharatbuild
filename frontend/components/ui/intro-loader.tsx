"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export const IntroLoader = () => {
    const [isVisible, setIsVisible] = useState(true);
    const [shouldRender, setShouldRender] = useState(true);

    useEffect(() => {
        // Check if we've already shown the intro in this session
        const hasShown = sessionStorage.getItem("hasShownIntro");
        if (hasShown) {
            setIsVisible(false);
            setShouldRender(false);
            return;
        }

        // Mark as shown
        sessionStorage.setItem("hasShownIntro", "true");

        // Fallback: If video takes too long or fails, dismiss after 4 seconds
        const timeout = setTimeout(() => {
            handleComplete();
        }, 60000); // 60 seconds max duration fallback

        return () => clearTimeout(timeout);
    }, []);

    const handleComplete = () => {
        setIsVisible(false);
        // Remove from DOM after transition
        setTimeout(() => {
            setShouldRender(false);
        }, 500); // Wait for transition
    };

    if (!shouldRender) return null;

    return (
        <div
            className={cn(
                "fixed inset-0 z-[9999] flex items-center justify-center bg-black transition-opacity duration-500 ease-in-out",
                isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
        >
            <video
                autoPlay
                muted
                playsInline
                // We removed 'loop' so it can end naturally
                className="h-full w-full object-cover"
                src="/logoreveal.mp4"
                onEnded={handleComplete}
            />
        </div>
    );
};
