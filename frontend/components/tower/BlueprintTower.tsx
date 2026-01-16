import React from 'react';

const TowerFloor = ({
    index,
    progress,
    totalFloors
}: {
    index: number
    progress: number
    totalFloors: number
}) => {
    const floorThreshold = index / totalFloors
    const floorProgress = Math.min(
        1,
        Math.max(0, (progress - floorThreshold) * totalFloors)
    )

    const opacity = 0.05 + floorProgress * 0.95
    const bottomOffset = index * 42
    const isActive = floorProgress > 0.05
    const isBuilding = floorProgress > 0 && floorProgress < 1
    const hw = 100
    const expandScaleY = 0.6 + floorProgress * 0.4
    const expandScaleX = 0.92 + floorProgress * 0.08

    return (
        <div
            className="absolute left-0 right-0 preserve-3d transition-all duration-900 ease-out"
            style={{
                height: '56px',
                bottom: `${bottomOffset}px`,
                opacity,
                transform: `translateY(${(1 - floorProgress) * 10}px) translateZ(${floorProgress * 22}px) scale(${0.96 + floorProgress * 0.04})`
            }}
        >
            {/* PANEL FACES ON ALL SIDES (FRONT / BACK / LEFT / RIGHT) */}
            {['front', 'back', 'left', 'right'].map(side => {
                const faceTransform = side === 'front'
                    ? `translateZ(${hw}px)`
                    : side === 'back'
                        ? `translateZ(-${hw}px) rotateY(180deg)`
                        : side === 'left'
                            ? `translateX(-${hw}px) rotateY(-90deg)`
                            : `translateX(${hw}px) rotateY(90deg)`;

                // Slightly reduce opacity for non-front faces for depth
                const faceOpacity = side === 'front' ? 1 : 0.9;

                return (
                    <div key={side} className="absolute inset-0 pointer-events-none" style={{ transform: faceTransform, opacity: faceOpacity }}>
                        <div className="absolute inset-0 rounded-sm overflow-hidden tower-panel panel-expand" style={{ transform: `scale(${expandScaleX}, ${expandScaleY})`, transformOrigin: 'center bottom' }} />

                        {/* Windows grid shared across faces */}
                        <div
                            className="absolute left-4 right-4 top-6 bottom-6 grid"
                            style={{
                                gridTemplateColumns: 'repeat(6, 1fr)',
                                gap: '6px',
                                opacity: isActive ? 1 : 0.18
                            }}
                        >
                            {Array.from({ length: 12 }).map((_, i) => (
                                <div key={side + i} className="tower-window rounded-sm" />
                            ))}
                        </div>

                        {/* Glass reflection overlay */}
                        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0))', mixBlendMode: 'screen', opacity: isActive ? 1 : 0.18 }} />

                        {/* Neon vertical stripe with animated dots - only while floor is building */}
                        {isBuilding && (
                            <>
                                <div className="absolute left-1 top-0 bottom-0 w-px neon-stripe">
                                    <div className="neon-dots">
                                        {Array.from({ length: 6 }).map((_, d) => <span key={d} className="neon-dot" />)}
                                    </div>
                                </div>
                                <div className="absolute right-1 top-0 bottom-0 w-px neon-stripe">
                                    <div className="neon-dots">
                                        {Array.from({ length: 6 }).map((_, d) => <span key={d} className="neon-dot" />)}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                );
            })}

            {/* TOP SLAB */}
            {/* TOP FACE FOR THIS FLOOR (visible as a grey horizontal face) */}
            <div
                className="absolute inset-0"
                style={{
                    height: `${hw * 2}px`,
                    transform: `translateY(-${hw}px) rotateX(90deg)`,
                    opacity: isActive ? 0.9 : 0.55,
                    pointerEvents: 'none'
                }}
            >
                <div className="absolute inset-0 floor-top" />
            </div>

            {/* FLOOR SHADOW */}
            <div className="absolute left-0 right-0 -bottom-6 flex justify-center pointer-events-none">
                <div
                    className="tower-shadow"
                    style={{ width: '220px', height: '26px', opacity: Math.min(0.6, floorProgress + 0.1) }}
                />
            </div>
        </div>
    )
}

const Antenna = ({ visible }: { visible: boolean }) => (
    <div className={`absolute left-1/2 bottom-full -translate-x-1/2 transition-all duration-1000 delay-300 preserve-3d ${visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-90'}`} style={{ height: '140px', width: '10px' }}>
        <div className="absolute inset-0 w-px bg-brand-orange/60 left-1/2 -translate-x-1/2 shadow-[0_0_12px_rgba(249,115,22,0.5)]"></div>
        {[15, 30, 45, 60, 75, 90].map(h => (
            <div key={h} className="absolute border-t border-brand-orange/40 w-16 -left-7.5" style={{ bottom: `${h}%` }}></div>
        ))}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-brand-orange animate-pulse shadow-[0_0_20px_rgba(249,115,22,0.85)] dark:shadow-[0_0_24px_rgba(249,115,22,1)]"></div>
    </div>
);

const BlueprintTower = ({ progress }: { progress: number }) => {
    const floors = 12;
    const rotation = progress * 170;

    // More cinematic perspective and lighting
    const pitch = -45;      // look DOWN from above
    const dynamicY = -40;  // lift camera upward
    const dynamicScale = 0.95;

    const hw = 90;
    // zoom effect when build completes: ease from 0.98->1.0 progress
    const zoomStart = 0.98;
    const zoomAmount = 0.12; // up to +12% scale
    const zoomProgress = Math.min(1, Math.max(0, (progress - zoomStart) / (1 - zoomStart)));
    const finalScale = dynamicScale * (1 + zoomProgress * zoomAmount);

    return (
        <div
            className="relative preserve-3d tower-zoom"
            style={{
                transform: `
          perspective(6200px)
          rotateX(${pitch}deg)
          rotateY(${35 + rotation}deg)
          translateY(${dynamicY}px)
          scale(${finalScale})
        `,
                width: `${hw * 2}px`,
                height: '480px'
            }}
        >
            {/* Enhanced foundation with soft ground lights */}
            <div className="absolute bottom-[-60px] left-[-120px] right-[-120px] h-40 preserve-3d">
                <div className="absolute inset-1 border-2 border-brand-orange/20"
                    style={{ transform: 'translateY(-116px) rotateX(90deg)', height: '420px', width: '420px', left: '0' }}>
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(rgba(249,115,22,0.16) 2px, transparent 2px), linear-gradient(90deg, rgba(249,115,22,0.16) 2px, transparent 2px)', backgroundSize: '24px 24px' }}></div>
                </div>
            </div>

            {[...Array(floors)].map((_, i) => (
                <TowerFloor key={i} index={i} progress={progress} totalFloors={floors} />
            ))}

            {/* TOP SLAB: appears once all floors are fully built; antenna will be attached to it */}
            {progress >= 0.999 && (
                <div className="absolute left-0 right-0" style={{ bottom: `${(floors - 1) * 42 + 56}px` }}>
                    <Antenna visible={progress > 0.78} />
                </div>
            )}
        </div>
    );
};

export default BlueprintTower;
