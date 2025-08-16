'use client';

import React from 'react';

function Banner() {
  return (
    <section
      id="hero"
      className="relative w-full min-h-screen bg-gradient-to-br from-red-600 via-red-500 to-red-700 overflow-hidden pt-20"
    >
     
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

        {/* Visual content */}
        <div className="w-full lg:w-1/2 relative mb-12 lg:mb-0 translate-y-12 sm:translate-y-0 transition-transform duration-300">
          <div className="relative z-20">
            <div className="relative mx-auto w-80 h-80 md:w-96 md:h-96 lg:w-[500px] lg:h-[500px]">
              
              <div className="absolute -top-10 -right-10 w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center text-2xl animate-float shadow-xl">
                🍟
              </div>
              <div className="absolute -bottom-10 -left-10 w-14 h-14 bg-blue-500 rounded-full flex items-center justify-center text-xl animate-bounce shadow-xl">
                🥤
              </div>
              <div className="absolute top-1/4 -left-16 w-12 h-12 bg-red-400 rounded-full flex items-center justify-center text-lg animate-pulse shadow-xl">
                🌮
              </div>
              <div className="absolute bottom-1/4 -right-16 w-12 h-12 bg-orange-400 rounded-full flex items-center justify-center text-lg animate-ping shadow-xl">
                🍕
              </div>
            </div>
          </div>

          {/* Glow effects */}
          <div className="absolute inset-0 bg-gradient-radial from-yellow-400/20 via-transparent to-transparent rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-blue-500/10 rounded-full blur-2xl"></div>
        </div>
      </div>

      
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
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-10px) rotate(5deg);
          }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </section>
  );
}

export default Banner;