'use client';

import React from 'react';

function Banner() {
  return (
    <section
      id="hero"
      className="relative w-full min-h-screen bg-gradient-to-br from-red-600 via-red-500 to-red-700 overflow-hidden pt-20"
    >
      {/* Background accents */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-blue-500 rounded-full opacity-15 animate-ping"></div>
        <div className="absolute bottom-20 left-1/3 w-20 h-20 bg-yellow-400 rounded-full opacity-20 animate-pulse"></div>
      </div>

      {/* Geometric patterns */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-96 h-96 border-4 border-blue-400 rounded-full transform rotate-45"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 border-2 border-blue-300 rounded-full"></div>
      </div>

      {/* Banner Content */}
      <div className="relative z-10 max-w-7xl mx-auto flex flex-col-reverse lg:flex-row items-center justify-between min-h-[calc(100vh-5rem)] px-6 md:px-12">
        
        {/* Left text section */}
        <div className="w-full lg:w-1/2 text-center lg:text-left pb-12 lg:pb-0">
          <h1 className="text-4xl md:text-3xl lg:text-5xl font-black text-white leading-none mb-6">
            <span className="block">The Only </span>
            <span className="block text-yellow-300 drop-shadow-lg">Place For The Best </span>
            <span className="block text-blue-200">Jollof And Fried Rice</span>
          </h1>

          <p className="text-white/90 text-4xl md:text-4xl mb-8 leading-relaxed font-medium">
            We deliver under 30 minutes!
          </p>

          {/* Quick stats */}
          <div className="flex justify-center lg:justify-start gap-8 mt-12 text-white">
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-300">15min</div>
              <div className="text-sm opacity-80">Avg Delivery</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-300">4.9★</div>
              <div className="text-sm opacity-80">Customer Rating</div>
            </div>
          </div>
        </div>

        {/* Right image section */}
        <div className="w-full lg:w-1/2 relative flex justify-center items-center">
          <div className="relative">
            {/* Main Food Image */}
            <img
              src="/images/food1.jpg"
              alt="Signature Jollof & Chicken"
              className="w-80 h-80 md:w-96 md:h-96 lg:w-[500px] lg:h-[500px] object-cover rounded-full border-8 border-white shadow-2xl animate-float-slow"
            />

            {/* Glowing background effect */}
            <div className="absolute inset-0 rounded-full blur-3xl bg-gradient-to-r from-yellow-400/40 via-red-500/30 to-orange-400/40 animate-pulse-slow"></div>

            {/* Floating accents */}
            <div className="absolute -top-10 -right-10 w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center text-2xl shadow-lg animate-bounce-slow">
              🍗
            </div>
            <div className="absolute -bottom-10 -left-10 w-14 h-14 bg-red-500 rounded-full flex items-center justify-center text-xl shadow-lg animate-spin-slow">
              🍚
            </div>
          </div>
        </div>
      </div>

      {/* Bottom wave divider */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
          className="w-full h-12 md:h-20"
        >
          <path
            d="M0,120 C150,60 350,0 600,20 C850,40 1050,100 1200,60 L1200,120 Z"
            fill="white"
          ></path>
        </svg>
      </div>

      <style jsx>{`
        @keyframes floatSlow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .animate-float-slow {
          animation: floatSlow 5s ease-in-out infinite;
        }

        @keyframes pulseSlow {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.05); opacity: 1; }
        }
        .animate-pulse-slow {
          animation: pulseSlow 6s ease-in-out infinite;
        }

        @keyframes bounceSlow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
        .animate-bounce-slow {
          animation: bounceSlow 4s ease-in-out infinite;
        }

        @keyframes spinSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spinSlow 20s linear infinite;
        }
      `}</style>
    </section>
  );
}

export default Banner;
