import React from "react";

export default function BurgerHero() {
    return (
        <div className="relative w-full h-[65vh] sm:h-[75vh] lg:h-[85vh] bg-black overflow-hidden">
            {/* Background Video — lazy-loaded to save bandwidth (12MB) */}
            <video
                src="/burger-video.mp4"
                className="absolute inset-0 w-full h-full object-cover"
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
            />

            {/* Overlay */}
            <div className="absolute inset-0 bg-black/40 z-10" />

            {/* Content */}
            <div className="relative z-20 h-full flex flex-col items-center justify-center text-center px-6">
                <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white uppercase tracking-tighter leading-tight drop-shadow-2xl">
                    La Perfeccion<br />
                    <span className="text-red-500">Deconstruida</span>
                </h1>
                <p className="mt-4 sm:mt-6 text-base sm:text-lg md:text-xl lg:text-2xl text-white/80 max-w-xs sm:max-w-xl lg:max-w-2xl font-medium px-4 sm:px-0">
                    Descubre el sabor autentico en cada capa.
                </p>
            </div>

            {/* Bottom fade */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-50 to-transparent z-20" />
        </div>
    );
}
