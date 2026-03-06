import React, { useRef, useEffect, useState } from "react";

export default function BurgerHero() {
    const containerRef = useRef(null);
    const videoRef = useRef(null);
    const [isVideoLoaded, setIsVideoLoaded] = useState(false);

    // Parallax text states
    const [progressObj, setProgressObj] = useState({ p: 0 });

    useEffect(() => {
        let rafId;
        // The target time the video SHOULD be at
        let targetTime = 0;
        // The current time the video IS at (smoothed)
        let currentTime = 0;

        const updateScroll = () => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            // Distance scrolled within the container
            const scrolled = -rect.top;
            const totalScrollable = rect.height - window.innerHeight;

            // Raw progress from 0 to 1
            let rawProgress = scrolled / totalScrollable;
            rawProgress = Math.max(0, Math.min(1, rawProgress));

            // Update react state for text animations
            setProgressObj({ p: rawProgress });

            const vid = videoRef.current;
            if (vid && isVideoLoaded && vid.duration) {
                targetTime = rawProgress * vid.duration;
            }
        };

        const loop = () => {
            updateScroll();

            // LERP for smooth scrubbing
            currentTime += (targetTime - currentTime) * 0.08;

            const vid = videoRef.current;
            if (vid && isVideoLoaded && vid.duration) {
                // To avoid thrashing the browser, only update if difference is > 0.005s
                if (Math.abs(vid.currentTime - currentTime) > 0.005) {
                    vid.currentTime = currentTime;
                }
            }

            rafId = requestAnimationFrame(loop);
        };

        loop();
        return () => cancelAnimationFrame(rafId);
    }, [isVideoLoaded]);

    const handleLoadedMetadata = () => {
        const vid = videoRef.current;
        if (vid && vid.duration && vid.duration > 0) {
            setIsVideoLoaded(true);
        }
    };

    const p = progressObj.p;

    return (
        <div
            ref={containerRef}
            style={{ position: "relative" }}
            className="h-[400vh] w-full bg-slate-950 font-sans z-0"
        >
            <div className="sticky top-0 flex h-screen w-full items-center justify-center overflow-hidden">
                {/* Loading State overlay */}
                {!isVideoLoaded && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950">
                        <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-800 border-t-red-500"></div>
                        <span className="animate-pulse text-sm font-bold uppercase tracking-widest text-slate-500">
                            Cargando magia...
                        </span>
                    </div>
                )}

                <video
                    ref={videoRef}
                    src="/burger-video.mp4"
                    className="h-full w-full scale-105 object-cover object-center sm:object-contain"
                    muted
                    playsInline
                    preload="auto"
                    onLoadedMetadata={handleLoadedMetadata}
                    onCanPlay={handleLoadedMetadata}
                />

                <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-slate-950/80 via-slate-950/20 to-slate-950"></div>

                {/* Text Overlay 1 - Intro */}
                <div
                    className="pointer-events-none absolute inset-0 z-20 mx-auto flex w-full max-w-4xl flex-col justify-end p-8 pb-24 transition-transform duration-75 sm:p-16 sm:pb-32"
                    style={{
                        opacity: p < 0.4 ? 1 : p < 0.6 ? 1 - (p - 0.4) * 5 : 0,
                        transform: `translateY(${p < 0.4 ? -p * 100 : -40 - (p - 0.4) * 200}px)`,
                    }}
                >
                    <h1
                        className="mb-4 text-5xl font-black uppercase leading-none tracking-tighter text-white drop-shadow-2xl sm:text-7xl md:text-8xl"
                        style={{ textShadow: "0 10px 40px rgba(0,0,0,0.9)" }}
                    >
                        La Perfección
                        <br />
                        <span className="text-red-500">Deconstruida</span>
                    </h1>
                    <p
                        className="max-w-xl text-lg font-medium text-slate-300 drop-shadow-md sm:text-2xl"
                        style={{ opacity: Math.max(0, 1 - p * 5) }}
                    >
                        Cada ingrediente seleccionado. Cada capa diseñada. Desliza hacia
                        abajo para descubrir la anatomía de tu próxima adicción.
                    </p>
                </div>

                {/* Text Overlay 2 - Outro/Action */}
                <div
                    className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center p-8 text-center"
                    style={{
                        opacity: p > 0.7 ? (p - 0.7) * 3.33 : 0,
                        transform: `scale(${p > 0.7 ? 0.8 + (p - 0.7) * 0.66 : 0.8})`,
                    }}
                >
                    <h2 className="mb-6 text-4xl font-black uppercase tracking-tighter text-white drop-shadow-2xl sm:text-6xl md:text-7xl">
                        ¿Listo para probarla?
                    </h2>
                </div>
            </div>
        </div>
    );
}
