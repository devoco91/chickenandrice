'use client';

import React, { useEffect, useState } from 'react';

function Banner() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section
      id="hero"
      className={`relative w-full bg-gradient-to-br from-red-700 via-red-600 to-red-800 overflow-hidden flex items-center justify-center py-16 md:py-24 mt-20 transition-all duration-1000 ${
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
      }`}
    >
      {/* Subtle overlay */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"></div>

      {/* Decorative orbiting food images */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-12 left-12 w-16 h-16 md:w-20 md:h-20 animate-orbit-slow">
          <img
            src="/images/food1.jpg"
            alt="Orbit Food 1"
            className="w-full h-full object-cover rounded-full border-4 border-white shadow-xl"
          />
        </div>

        <div className="absolute top-24 right-20 w-14 h-14 md:w-20 md:h-20 animate-orbit-medium">
          <img
            src="/images/food2.jpg"
            alt="Orbit Food 2"
            className="w-full h-full object-cover rounded-full border-4 border-white shadow-lg"
          />
        </div>

        <div className="absolute bottom-16 left-24 w-12 h-12 md:w-16 md:h-16 animate-orbit-fast">
          <img
            src="/images/food1.jpg"
            alt="Orbit Food 3"
            className="w-full h-full object-cover rounded-full border-4 border-white shadow-md"
          />
        </div>
      </div>

      {/* Banner Content */}
      <div className="relative z-10 max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between w-full px-6 sm:px-10 md:px-12 gap-12">
        
        {/* Left text section */}
        <div className="w-full lg:w-1/2 text-center lg:text-left flex flex-col items-center lg:items-start">
          <h1
            className={`text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6 tracking-tight transition-all duration-1000 delay-200 ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            <span className="block">The Only</span>
            <span className="block text-yellow-300 drop-shadow-md">Place For The Best</span>
            <span className="block text-blue-200">Jollof And Fried Rice</span>
          </h1>

          <p
            className={`text-white/90 text-base sm:text-lg md:text-xl lg:text-2xl mb-8 leading-relaxed font-medium transition-all duration-1000 delay-500 ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            We deliver under 30 minutes!
          </p>

          {/* Quick stats */}
          <div
            className={`flex justify-center lg:justify-start gap-10 mt-4 text-white transition-all duration-1000 delay-700 ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-yellow-300">15min</div>
              <div className="text-sm sm:text-base opacity-80">Avg Delivery</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-blue-300">4.9★</div>
              <div className="text-sm sm:text-base opacity-80">Customer Rating</div>
            </div>
          </div>
        </div>

        {/* Right image section */}
        <div
          className={`w-full lg:w-1/2 flex justify-center items-center gap-6 sm:gap-8 transition-all duration-1000 delay-900 ${
            mounted ? "opacity-100 scale-100" : "opacity-0 scale-90"
          }`}
        >
          {/* Food 1 */}
          <div className="relative group">
            <img
              src="/images/food1.jpg"
              alt="Food 1"
              className="w-32 h-32 sm:w-44 sm:h-44 md:w-60 md:h-60 lg:w-72 lg:h-72 object-cover rounded-2xl border-4 border-white shadow-xl transform transition duration-500 group-hover:scale-105 group-hover:shadow-2xl"
            />
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 steam"></div>
          </div>

          {/* Food 2 */}
          <div className="relative group">
            <img
              src="/images/food2.jpg"
              alt="Food 2"
              className="w-32 h-32 sm:w-44 sm:h-44 md:w-60 md:h-60 lg:w-72 lg:h-72 object-cover rounded-2xl border-4 border-white shadow-xl transform transition duration-500 group-hover:scale-105 group-hover:shadow-2xl"
            />
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 steam"></div>
          </div>
        </div>
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes orbitSlow {
          from { transform: rotate(0deg) translateX(80px) rotate(0deg); }
          to { transform: rotate(360deg) translateX(80px) rotate(-360deg); }
        }
        @keyframes orbitMedium {
          from { transform: rotate(0deg) translateX(120px) rotate(0deg); }
          to { transform: rotate(360deg) translateX(120px) rotate(-360deg); }
        }
        @keyframes orbitFast {
          from { transform: rotate(0deg) translateX(60px) rotate(0deg); }
          to { transform: rotate(360deg) translateX(60px) rotate(-360deg); }
        }
        .animate-orbit-slow {
          animation: orbitSlow 25s linear infinite;
          transform-origin: center;
        }
        .animate-orbit-medium {
          animation: orbitMedium 18s linear infinite;
          transform-origin: center;
        }
        .animate-orbit-fast {
          animation: orbitFast 12s linear infinite;
          transform-origin: center;
        }

        .steam {
          width: 30px;
          height: 60px;
          position: relative;
        }
        .steam::before,
        .steam::after {
          content: "";
          position: absolute;
          left: 50%;
          width: 8px;
          height: 30px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.6);
          animation: rise 3s ease-in-out infinite;
        }
        .steam::after {
          left: 30%;
          width: 6px;
          height: 20px;
          animation-duration: 4s;
          animation-delay: 1s;
        }
        @keyframes rise {
          0% { transform: translateY(20px) scale(0.5); opacity: 0; }
          50% { opacity: 0.8; }
          100% { transform: translateY(-50px) scale(1); opacity: 0; }
        }
      `}</style>
    </section>
  );
}

export default Banner;
