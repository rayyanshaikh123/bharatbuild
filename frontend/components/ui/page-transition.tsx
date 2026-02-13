"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export const PageTransition = ({ children }: { children: React.ReactNode }) => {
    const [showVideo, setShowVideo] = useState(true);

    // When this component mounts (which happens on every template navigation),
    // we start with showVideo = true.

    const handleVideoEnded = () => {
        // Hide video
        setShowVideo(false);
    };

    return (
        <>
            {/* Video Overlay */}
            <div
                className={cn(
                    "fixed inset-0 z-[9999] flex items-center justify-center bg-black transition-opacity duration-700",
                    showVideo ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
            >
                <video
                    autoPlay
                    muted
                    playsInline
                    className="h-full w-full object-cover"
                    src="/logoreveal.mp4"
                    onEnded={handleVideoEnded}
                />
            </div>

            {/* Actual Page Content */}
            <div
                className={cn(
                    "transition-opacity duration-700",
                    showVideo ? "opacity-0" : "opacity-100"
                )}
            >
                {children}
            </div>
        </>
    );
};
