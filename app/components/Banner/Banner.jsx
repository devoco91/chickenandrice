'use client';

import React from 'react';

function Banner() {
  return (
    <section
      id="hero"
      className="relative w-full bg-gradient-to-br from-red-600 via-red-500 to-red-700 overflow-hidden flex items-center justify-center py-12 md:py-20 pt-29"
    >
      {/* Banner Content */}
      <div className="relative z-10 max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between w-full px-4 sm:px-6 md:px-12 gap-8">
        
        {/* Left text section */}
        <div className="w-full lg:w-1/2 text-center lg:text-left flex flex-col items-center lg:items-start">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight mb-4">
            <span className="block">The Only </span>
            <span className="block text-yellow-300 drop-shadow-lg">Place For The Best </span>
            <span className="block text-blue-200">Jollof And Fried Rice</span>
          </h1>

          <p className="text-white/90 text-base sm:text-lg md:text-xl lg:text-2xl mb-6 leading-relaxed font-medium">
            We deliver under 30 minutes!
          </p>

          {/* Quick stats */}
          <div className="flex justify-center lg:justify-start gap-6 sm:gap-10 mt-2 text-white">
            <div className="text-center">
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-yellow-300">15min</div>
              <div className="text-xs sm:text-sm opacity-80">Avg Delivery</div>
            </div>
            <div className="text-center">
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-blue-300">4.9★</div>
              <div className="text-xs sm:text-sm opacity-80">Customer Rating</div>
            </div>
          </div>
        </div>

        {/* Right image section */}
        <div className="w-full lg:w-1/2 flex flex-wrap justify-center items-center gap-6 sm:gap-8">
          {/* Food 1 */}
          <div className="relative">
            <img
              src="/images/food1.jpg"
              alt="Food 1"
              className="w-28 h-28 sm:w-40 sm:h-40 md:w-56 md:h-56 lg:w-72 lg:h-72 object-cover rounded-full border-8 border-white shadow-2xl animate-float-slow"
            />
            {/* Steam */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 steam"></div>
          </div>

          {/* Food 2 */}
          <div className="relative">
            <img
              src="/images/food2.jpg"
              alt="Food 2"
              className="w-28 h-28 sm:w-40 sm:h-40 md:w-56 md:h-56 lg:w-72 lg:h-72 object-cover rounded-full border-8 border-white shadow-2xl animate-float-slow animate-tilt"
            />
            {/* Steam */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 steam"></div>
          </div>
        </div>
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes floatSlow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        .animate-float-slow {
          animation: floatSlow 5s ease-in-out infinite;
        }

        @keyframes tilt {
          0%, 100% { transform: rotate(-3deg); }
          50% { transform: rotate(3deg); }
        }
        .animate-tilt {
          animation: tilt 4s ease-in-out infinite;
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
