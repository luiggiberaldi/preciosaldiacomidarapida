import React, { useRef, useEffect, useState } from 'react';

export default function BurgerHero() {
    const containerRef = useRef(null);
    const videoRef = useRef(null);
    const [isVideoLoaded, setIsVideoLoaded] = useState(false);

    // Smooth scrubbing state
    const targetTime = useRef(0);
    const currentTime = useRef(0);

    useEffect(() => {
        let animationFrameId;

        const smoothScroll = () => {
            // Lerp (Linear Interpolation) for buttery smooth video scrubbing
            currentTime.current += (targetTime.current - currentTime.current) * 0.1;

            if (videoRef.current && isVideoLoaded && videoRef.current.duration) {
                // Only update if there's a significant difference to avoid infinite micro-updates
                if (Math.abs(videoRef.current.currentTime - currentTime.current) > 0.01) {
                    videoRef.current.currentTime = currentTime.current;
                }
            }

            animationFrameId = requestAnimationFrame(smoothScroll);
        };

        animationFrameId = requestAnimationFrame(smoothScroll);
        return () => cancelAnimationFrame(animationFrameId);
    }, [isVideoLoaded]);

    useEffect(() => {
        const handleScroll = () => {
            if (!containerRef.current || !videoRef.current || !isVideoLoaded) return;

            const rect = containerRef.current.getBoundingClientRect();
            // Calculate how far we've scrolled into the container
            const scrolled = -rect.top;
            // Calculate total scrollable distance for this container
            const totalScrollable = rect.height - window.innerHeight;

            let progress = scrolled / totalScrollable;

            // Clamp progress between 0 and 1
            progress = Math.max(0, Math.min(1, progress));

            // Update the target time based on progress
            if (videoRef.current.duration) {
                targetTime.current = progress * videoRef.current.duration;
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        // Trigger once on mount
        handleScroll();

        return () => window.removeEventListener('scroll', handleScroll);
    }, [isVideoLoaded]);

    return (
        <div ref={containerRef} className="relative h-[350vh] bg-slate-950 w-full z-0">
            <div className="sticky top-0 h-screen w-full flex items-center justify-center overflow-hidden">

                {/* Loading State overlay */}
                {!isVideoLoaded && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950">
                        <div className="w-10 h-10 border-4 border-slate-800 border-t-red-500 rounded-full animate-spin"></div>
                    </div>
                )}

                <video
                    ref={videoRef}
                    src="/burger-video.mp4"
                    className="w-full h-full object-cover sm:object-contain object-center scale-105"
                    muted
                    playsInline
                    preload="auto"
                    onLoadedMetadata={() => setIsVideoLoaded(true)}
                />

                {/* Shadow overlays for dramatic effect */}
                <div className="absolute inset-0 bg-gradient-to-b from-slate-950/60 via-transparent to-slate-950 z-10"></div>

                {/* Text Overlay - Changes based on scroll using intersection observers or simple sticky */}
                <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-end p-8 sm:p-16 max-w-4xl mx-auto w-full pb-24 sm:pb-32">
                    <h1 className="text-5xl sm:text-7xl font-black text-white/90 uppercase tracking-tighter drop-shadow-2xl mb-4" style={{ textShadow: "0 10px 30px rgba(0,0,0,0.8)" }}>
                        La Perfección<br />
                        <span className="text-red-500">Deconstruida</span>
                    </h1>
                    <p className="text-lg sm:text-2xl font-medium text-slate-300 max-w-xl drop-shadow-md">
                        Ingredientes de primera calidad en cada bocado. Desliza para descubrir el arte detrás de nuestra receta secreta.
                    </p>
                </div>
            </div>
        </div>
    );
}
