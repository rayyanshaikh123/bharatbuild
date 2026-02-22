import React from "react";

export const VideoLoader = () => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <video
                autoPlay
                muted
                loop
                playsInline
                className="h-full w-full object-cover"
                src="/logoreveal.mp4"
            />
        </div>
    );
};
