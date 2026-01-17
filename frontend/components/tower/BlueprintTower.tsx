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
    const bottomOffset = index * 38
    const isActive = floorProgress > 0.05
    const isBuilding = floorProgress > 0 && floorProgress < 1
    const hw = 85
    const expandScaleY = 0.6 + floorProgress * 0.4
    const expandScaleX = 0.92 + floorProgress * 0.08

    return (
        <div
            className="absolute left-0 right-0 preserve-3d transition-all duration-900 ease-out"
            style={{
                height: '50px',
                bottom: `${bottomOffset}px`,
                opacity,
                transform: `translateY(${(1 - floorProgress) * 8}px) translateZ(${floorProgress * 18}px) scale(${0.96 + floorProgress * 0.04})`
            }}
        >
            {/* PANEL FACES ON ALL SIDES */}
            {['front', 'back', 'left', 'right'].map(side => {
                const faceTransform = side === 'front'
                    ? `translateZ(${hw}px)`
                    : side === 'back'
                        ? `translateZ(-${hw}px) rotateY(180deg)`
                        : side === 'left'
                            ? `translateX(-${hw}px) rotateY(-90deg)`
                            : `translateX(${hw}px) rotateY(90deg)`;

                const faceOpacity = side === 'front' ? 1 : 0.9;

                return (
                    <div key={side} className="absolute inset-0 pointer-events-none" style={{ transform: faceTransform, opacity: faceOpacity }}>
                        <div className="absolute inset-0 rounded-sm overflow-hidden tower-panel panel-expand" style={{ transform: `scale(${expandScaleX}, ${expandScaleY})`, transformOrigin: 'center bottom' }} />

                        {/* Windows grid */}
                        <div
                            className="absolute left-3 right-3 top-5 bottom-5 grid"
                            style={{
                                gridTemplateColumns: 'repeat(5, 1fr)',
                                gap: '5px',
                                opacity: isActive ? 1 : 0.18
                            }}
                        >
                            {Array.from({ length: 10 }).map((_, i) => (
                                <div key={side + i} className="tower-window rounded-sm" />
                            ))}
                        </div>

                        {/* Glass reflection */}
                        <div className="absolute inset-0 glass-reflection" style={{ mixBlendMode: 'screen', opacity: isActive ? 1 : 0.18 }} />

                        {/* Blinking neon stripes while building */}
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
            <div className="absolute left-0 right-0 -bottom-5 flex justify-center pointer-events-none">
                <div
                    className="tower-shadow"
                    style={{ width: '190px', height: '24px', opacity: Math.min(0.6, floorProgress + 0.1) }}
                />
            </div>
        </div>
    )
}

const Antenna = ({ visible }: { visible: boolean }) => (
    <div className={`absolute left-1/2 bottom-full -translate-x-1/2 transition-all duration-1000 delay-300 preserve-3d ${visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-90'}`} style={{ height: '140px', width: '10px' }}>
        {/* Main antenna pole */}
        <div className="absolute inset-0 w-px bg-primary/60 left-1/2 -translate-x-1/2 shadow-[0_0_12px_var(--ring)]"></div>
        {/* Horizontal bars */}
        {[15, 30, 45, 60, 75, 90].map(h => (
            <div key={h} className="absolute border-t border-primary/40 w-16 -left-7" style={{ bottom: `${h}%` }}></div>
        ))}
        {/* Blinking tip light */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-primary animate-pulse shadow-[0_0_20px_var(--ring)]"></div>
        {/* Secondary blinking lights on bars */}
        {[30, 60, 90].map(h => (
            <div key={`light-${h}`} className="absolute left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary/80 animate-pulse shadow-[0_0_8px_var(--ring)]" style={{ bottom: `${h}%`, animationDelay: `${h * 10}ms` }}></div>
        ))}
    </div>
);

const BlueprintTower = ({ progress }: { progress: number }) => {
    const floors = 11;
    const rotation = progress * 170;

    // Slightly larger tower, base moved down more
    const pitch = -45;
    const dynamicY = 0;   // Moved base further down
    const dynamicScale = 0.88;  // Slightly larger

    const hw = 85;
    const zoomStart = 0.98;
    const zoomAmount = 0.10;
    const zoomProgress = Math.min(1, Math.max(0, (progress - zoomStart) / (1 - zoomStart)));
    const finalScale = dynamicScale * (1 + zoomProgress * zoomAmount);

    return (
        <div
            className="relative preserve-3d tower-zoom"
            style={{
                transform: `
          perspective(5500px)
          rotateX(${pitch}deg)
          rotateY(${35 + rotation}deg)
          translateY(${dynamicY}px)
          scale(${finalScale})
        `,
                width: `${hw * 2}px`,
                height: '450px'
            }}
        >
            {/* Foundation - moved further down */}
            <div className="absolute bottom-[-100px] left-[-110px] right-[-110px] h-40 preserve-3d">
                <div className="absolute inset-1 border-2 border-primary/20"
                    style={{ transform: 'translateY(-110px) rotateX(90deg)', height: '380px', width: '380px', left: '0' }}>
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(var(--ring) 2px, transparent 2px), linear-gradient(90deg, var(--ring) 2px, transparent 2px)', backgroundSize: '22px 22px' }}></div>
                </div>
            </div>

            {[...Array(floors)].map((_, i) => (
                <TowerFloor key={i} index={i} progress={progress} totalFloors={floors} />
            ))}

            {/* Antenna with blinking lights - appears when complete */}
            {progress >= 0.999 && (
                <div className="absolute left-0 right-0" style={{ bottom: `${(floors - 1) * 38 + 50}px` }}>
                    <Antenna visible={progress > 0.78} />
                </div>
            )}
        </div>
    );
};

export default BlueprintTower;
