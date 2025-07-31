'use client'
import React from 'react';

function Banner() {
    return (
        <section
            id="hero"
            className="relative w-full min-h-screen bg-gradient-to-br from-red-600 via-red-500 to-red-700 overflow-hidden"
        >
            {/* Animated background elements */}
            <div className="absolute inset-0">
                <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-blue-500 rounded-full opacity-15 animate-ping"></div>
                <div className="absolute bottom-20 left-1/3 w-20 h-20 bg-yellow-400 rounded-full opacity-20 animate-pulse"></div>
            </div>

            {/* Geometric patterns */}
            <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-96 h-96 border-4 border-blue-400 rounded-full transform rotate-45"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 border-2 border-blue-300 rounded-full"></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto flex flex-col-reverse lg:flex-row items-center justify-between min-h-screen px-6 md:px-12">
                {/* Text content */}
                <div className="w-full lg:w-1/2 text-center lg:text-left pb-12 lg:pb-0">
                    

                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-none mb-6">
                        <span className="block">FAST</span>
                        <span className="block text-yellow-300 drop-shadow-lg">FOOD</span>
                        <span className="block text-blue-200">DELIVERED</span>
                    </h1>

                    <p className="text-white/90 text-xl md:text-2xl mb-8 leading-relaxed font-medium">
                        Craving something delicious? We deliver your favorite meals
                        <span className="text-yellow-300 font-bold"> hot & fresh </span>
                        right to your door in under 30 minutes!
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                        <button className="group bg-yellow-400 hover:bg-yellow-300 text-red-900 font-bold py-4 px-8 rounded-full text-lg shadow-2xl transform hover:scale-105 transition-all duration-300 hover:shadow-yellow-400/50">
                            <span className="flex items-center justify-center gap-2">
                                ORDER NOW
                                <span className="group-hover:translate-x-1 transition-transform">🍔</span>
                            </span>
                        </button>

                        <button className="group bg-transparent border-3 border-white text-white hover:bg-white hover:text-red-600 font-bold py-4 px-8 rounded-full text-lg shadow-xl transform hover:scale-105 transition-all duration-300">
                            <span className="flex items-center justify-center gap-2">
                                VIEW MENU
                                <span className="group-hover:rotate-12 transition-transform">📱</span>
                            </span>
                        </button>
                    </div>

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
                        <div className="text-center">
                            <div className="text-3xl font-bold text-white">24/7</div>
                            <div className="text-sm opacity-80">Always Open</div>
                        </div>
                    </div>
                </div>

                {/* Visual content */}
                <div className="w-full lg:w-1/2 relative mb-12 lg:mb-0">
                    <div className="relative z-20">
                        <div className="relative mx-auto w-80 h-80 md:w-96 md:h-96 lg:w-[500px] lg:h-[500px]">
                            {/* Burger illustration using CSS */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="relative">
                                    {/* Burger bun top */}
                                    <div className="w-64 h-32 bg-gradient-to-b from-yellow-600 to-yellow-700 rounded-t-full shadow-2xl transform -rotate-2"></div>

                                    {/* Lettuce */}
                                    <div className="w-60 h-8 bg-green-400 rounded-full shadow-lg transform rotate-1 -mt-2"></div>

                                    {/* Tomato */}
                                    <div className="w-56 h-6 bg-red-500 rounded-full shadow-lg transform -rotate-1 -mt-1"></div>

                                    {/* Cheese */}
                                    <div className="w-58 h-4 bg-yellow-400 rounded-full shadow-lg transform rotate-2 -mt-1"></div>

                                    {/* Meat patty */}
                                    <div className="w-60 h-12 bg-gradient-to-b from-amber-800 to-amber-900 rounded-full shadow-xl transform -rotate-1 -mt-1"></div>

                                    {/* Burger bun bottom */}
                                    <div className="w-64 h-16 bg-gradient-to-t from-yellow-700 to-yellow-600 rounded-b-full shadow-2xl transform rotate-1 -mt-2"></div>
                                </div>
                            </div>

                            {/* Floating food items */}
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

            {/* Bottom wave */}
            <div className="absolute bottom-0 left-0 right-0">
                <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-12 md:h-20">
                    <path d="M0,120 C150,60 350,0 600,20 C850,40 1050,100 1200,60 L1200,120 Z" fill="white"></path>
                </svg>
            </div>

            <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(5deg); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
        </section>
    );
}

export default Banner;