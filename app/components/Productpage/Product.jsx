'use client'
import React from 'react';
import Link from 'next/link';
import { ShoppingBag, Plus, Minus, ShoppingCart, Star, Filter, Search } from 'lucide-react';

// Navbar Component - Design Only
const Navbar = () => {
    return (
        <nav className="fixed top-0 left-0 w-full bg-transparent z-50">
            <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">

                {/* Logo - bigger, stronger */}
                <Link href="/" className="hover:opacity-80 transition-opacity duration-200">
                    <h1 className="text-4xl font-extrabold text-white tracking-tight drop-shadow-lg">
                        Logo<span className="text-blue-500">.</span>
                    </h1>
                </Link>

                {/* Cart Icon - with blue badge */}
                <div className="relative group">
                    <button
                        className="flex items-center justify-center w-12 h-12 bg-white/20 backdrop-blur-sm text-white rounded-full hover:bg-white/30 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 border border-white/20"
                        aria-label="Shopping cart"
                    >
                        <ShoppingBag className="w-6 h-6" />
                    </button>

                    {/* Cart Badge - placeholder */}
                    <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-md transition-all duration-200">
                        3
                    </span>

                    <div className="absolute right-0 top-full mt-2 px-3 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                        View Cart (3 items)
                    </div>
                </div>
            </div>
        </nav>
    );
};

// Products Component - Design Only
const FastFoodProducts = () => {
    const categories = [
        { id: 'all', name: 'All Items', count: 32 },
        { id: 'burgers', name: 'Burgers', count: 8 },
        { id: 'chicken', name: 'Chicken', count: 6 },
        { id: 'classicfries', name: 'Classic Fries', count: 4 },
        { id: 'drinks', name: 'Drinks', count: 5 },
        { id: 'hotdogs', name: 'Hot Dogs', count: 4 },
        { id: 'onionrings', name: 'Onion Rings', count: 3 },
        { id: 'cheese', name: 'Cheese Specials', count: 3 },
        { id: 'pizza', name: 'Pizza', count: 4 },
        { id: 'sides', name: 'Sides', count: 6 }
    ];

    const products = [
        // BURGERS
        {
            id: 1,
            name: 'Big Crispy Burger',
            category: 'burgers',
            price: 12.99,
            originalPrice: 15.99,
            description: 'Double beef patty with crispy lettuce, tomatoes, and our special sauce',
            image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop',
            rating: 4.8,
            isPopular: true,
            badges: ['Bestseller']
        },
        {
            id: 2,
            name: 'Classic Cheeseburger',
            category: 'burgers',
            price: 9.99,
            description: 'Juicy beef patty with melted cheese, pickles, and ketchup',
            image: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=300&fit=crop',
            rating: 4.5,
            badges: []
        },
        {
            id: 3,
            name: 'BBQ Bacon Burger',
            category: 'burgers',
            price: 13.99,
            description: 'Smoky BBQ sauce, crispy bacon, and onion rings on a beef patty',
            image: 'https://images.unsplash.com/photo-1553979459-d2229ba7433a?w=400&h=300&fit=crop',
            rating: 4.9,
            isPopular: true,
            badges: ['Premium']
        },
        {
            id: 4,
            name: 'Mushroom Swiss Burger',
            category: 'burgers',
            price: 11.99,
            originalPrice: 13.99,
            description: 'Grilled mushrooms and Swiss cheese on a juicy beef patty',
            image: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=400&h=300&fit=crop',
            rating: 4.6,
            badges: ['Chef Special']
        },
        {
            id: 5,
            name: 'Veggie Burger',
            category: 'burgers',
            price: 10.99,
            description: 'Plant-based patty with avocado, sprouts, and garlic aioli',
            image: 'https://images.unsplash.com/photo-1520072959219-c595dc870360?w=400&h=300&fit=crop',
            rating: 4.3,
            badges: ['Vegetarian', 'Healthy']
        },

        // CHICKEN
        {
            id: 6,
            name: 'Spicy Chicken Deluxe',
            category: 'chicken',
            price: 11.99,
            description: 'Crispy spiced chicken breast with jalapeños and pepper jack cheese',
            image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTRvdXeZTgzO96_OjqQ7dDsg2h8ggpvvksJOA&s',
            rating: 4.6,
            badges: ['Spicy', 'New']
        },
        {
            id: 7,
            name: 'Crispy Chicken Wings',
            category: 'chicken',
            price: 8.99,
            description: '8 pieces of golden crispy wings with your choice of sauce',
            image: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=400&h=300&fit=crop',
            rating: 4.7,
            badges: ['Popular']
        },
        {
            id: 8,
            name: 'Chicken Tenders',
            category: 'chicken',
            price: 9.99,
            description: 'Hand-breaded chicken strips with honey mustard dipping sauce',
            image: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=400&h=300&fit=crop',
            rating: 4.5,
            badges: ['Kids Favorite']
        },
        {
            id: 9,
            name: 'Buffalo Chicken Wrap',
            category: 'chicken',
            price: 8.49,
            description: 'Spicy buffalo chicken with lettuce, tomatoes in a flour tortilla',
            image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop',
            rating: 4.4,
            badges: ['Spicy']
        },

        // CLASSIC FRIES
        {
            id: 10,
            name: 'Classic Fries',
            category: 'classicfries',
            price: 3.99,
            description: 'Golden crispy french fries seasoned with sea salt',
            image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&h=300&fit=crop',
            rating: 4.2,
            badges: []
        },
        {
            id: 11,
            name: 'Loaded Fries',
            category: 'classicfries',
            price: 6.99,
            description: 'Crispy fries topped with cheese, bacon bits, and green onions',
            image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&h=300&fit=crop',
            rating: 4.4,
            badges: ['Popular']
        },
        {
            id: 12,
            name: 'Sweet Potato Fries',
            category: 'classicfries',
            price: 4.99,
            description: 'Crispy sweet potato fries with cinnamon sugar',
            image: 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=400&h=300&fit=crop',
            rating: 4.3,
            badges: ['Healthy']
        },
        {
            id: 13,
            name: 'Curly Fries',
            category: 'classicfries',
            price: 4.49,
            description: 'Seasoned curly fries with paprika and garlic powder',
            image: 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=400&h=300&fit=crop',
            rating: 4.1,
            badges: []
        },

        // DRINKS
        {
            id: 14,
            name: 'Chocolate Milkshake',
            category: 'drinks',
            price: 4.99,
            description: 'Rich and creamy chocolate milkshake topped with whipped cream',
            image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&h=300&fit=crop',
            rating: 4.3,
            badges: []
        },
        {
            id: 15,
            name: 'Vanilla Shake',
            category: 'drinks',
            price: 4.99,
            description: 'Classic vanilla milkshake with real vanilla beans',
            image: 'https://images.unsplash.com/photo-1541591919183-1a3b099aa9c7?w=400&h=300&fit=crop',
            rating: 4.2,
            badges: []
        },
        {
            id: 16,
            name: 'Fresh Lemonade',
            category: 'drinks',
            price: 2.99,
            description: 'Freshly squeezed lemonade with mint leaves',
            image: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=400&h=300&fit=crop',
            rating: 4.0,
            badges: ['Refreshing']
        },
        {
            id: 17,
            name: 'Iced Coffee',
            category: 'drinks',
            price: 3.49,
            description: 'Cold brew coffee with cream and sugar',
            image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&h=300&fit=crop',
            rating: 4.1,
            badges: []
        },

        // HOT DOGS
        {
            id: 18,
            name: 'Classic Hot Dog',
            category: 'hotdogs',
            price: 4.99,
            description: 'All-beef hot dog with mustard, ketchup, and onions',
            image: 'https://images.unsplash.com/photo-1612392166886-ee7c818526d7?w=400&h=300&fit=crop',
            rating: 4.0,
            badges: []
        },
        {
            id: 19,
            name: 'Chili Cheese Dog',
            category: 'hotdogs',
            price: 6.99,
            description: 'Hot dog topped with chili, cheese, and diced onions',
            image: 'https://images.unsplash.com/photo-1612392166886-ee7c818526d7?w=400&h=300&fit=crop',
            rating: 4.3,
            badges: ['Popular']
        },
        {
            id: 20,
            name: 'Chicago Style Dog',
            category: 'hotdogs',
            price: 7.49,
            description: 'All-beef hot dog with yellow mustard, onions, relish, tomatoes, pickle, and celery salt',
            image: 'https://images.unsplash.com/photo-1612392166886-ee7c818526d7?w=400&h=300&fit=crop',
            rating: 4.5,
            badges: ['Signature']
        },

        // ONION RINGS
        {
            id: 21,
            name: 'Classic Onion Rings',
            category: 'onionrings',
            price: 5.99,
            description: 'Golden crispy onion rings with ranch dipping sauce',
            image: 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=400&h=300&fit=crop',
            rating: 4.2,
            badges: []
        },
        {
            id: 22,
            name: 'Beer Battered Rings',
            category: 'onionrings',
            price: 6.99,
            description: 'Extra crispy beer-battered onion rings with spicy mayo',
            image: 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=400&h=300&fit=crop',
            rating: 4.4,
            badges: ['Premium']
        },

        // CHEESE SPECIALS
        {
            id: 23,
            name: 'Mac & Cheese',
            category: 'cheese',
            price: 7.99,
            description: 'Creamy mac and cheese with three-cheese blend',
            image: 'https://images.unsplash.com/photo-1543339494-b4cd4f7ba686?w=400&h=300&fit=crop',
            rating: 4.6,
            badges: ['Comfort Food']
        },
        {
            id: 24,
            name: 'Cheese Quesadilla',
            category: 'cheese',
            price: 6.49,
            description: 'Grilled tortilla with melted cheese blend and salsa',
            image: 'https://images.unsplash.com/photo-1565299585323-38174c26dee7?w=400&h=300&fit=crop',
            rating: 4.3,
            badges: []
        },
        {
            id: 25,
            name: 'Cheese Sticks',
            category: 'cheese',
            price: 5.99,
            description: 'Breaded mozzarella sticks with marinara sauce',
            image: 'https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?w=400&h=300&fit=crop',
            rating: 4.1,
            badges: ['Appetizer']
        },

        // PIZZA
        {
            id: 26,
            name: 'Margherita Pizza',
            category: 'pizza',
            price: 11.99,
            description: 'Fresh mozzarella, tomatoes, and basil on thin crust',
            image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop',
            rating: 4.5,
            badges: ['Classic']
        },
        {
            id: 27,
            name: 'Pepperoni Pizza',
            category: 'pizza',
            price: 12.99,
            description: 'Classic pepperoni with mozzarella cheese',
            image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop',
            rating: 4.7,
            badges: ['Popular']
        },
        {
            id: 28,
            name: 'Meat Lovers Pizza',
            category: 'pizza',
            price: 15.99,
            description: 'Pepperoni, sausage, bacon, and ham with cheese',
            image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop',
            rating: 4.8,
            badges: ['Premium']
        },
        {
            id: 29,
            name: 'Veggie Supreme Pizza',
            category: 'pizza',
            price: 13.99,
            description: 'Bell peppers, mushrooms, onions, olives, and tomatoes',
            image: 'https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?w=400&h=300&fit=crop',
            rating: 4.4,
            badges: ['Vegetarian']
        },

        // ADDITIONAL SIDES
        {
            id: 30,
            name: 'Coleslaw',
            category: 'sides',
            price: 2.99,
            description: 'Fresh cabbage slaw with creamy dressing',
            image: 'https://images.unsplash.com/photo-1590736969955-71cc94901144?w=400&h=300&fit=crop',
            rating: 3.9,
            badges: ['Healthy']
        },
        {
            id: 31,
            name: 'Pickle Spears',
            category: 'sides',
            price: 1.99,
            description: 'Crispy dill pickle spears',
            image: 'https://images.unsplash.com/photo-1583623025817-d180a2221d0a?w=400&h=300&fit=crop',
            rating: 4.0,
            badges: []
        },
        {
            id: 32,
            name: 'Garden Salad',
            category: 'sides',
            price: 5.99,
            description: 'Mixed greens with tomatoes, cucumbers, and your choice of dressing',
            image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop',
            rating: 4.2,
            badges: ['Healthy']
        }
    ];

    // Helper function to get products by category
    const getProductsByCategory = (categoryId) => {
        if (categoryId === 'all') {
            return products;
        }
        return products.filter(product => product.category === categoryId);
    };

  

    const popularProducts = products.filter(product => product.isPopular);

    return (
        <div className="min-h-screen bg-gray-50 pt-20">
            {/* Hero Section */}
            <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white py-16">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">Our Delicious Menu</h1>
                    <p className="text-xl opacity-90">Fresh ingredients, bold flavors, fast delivery</p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Search and Cart Summary */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search menu items..."
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        />
                    </div>

                    {/* Cart Summary - Static for design */}
                    <div className="bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg">
                        <div className="flex items-center gap-2">
                            <ShoppingCart className="w-5 h-5" />
                            <span className="font-semibold">3 items</span>
                            <span className="text-red-200">•</span>
                            <span className="font-bold">$35.97</span>
                        </div>
                    </div>
                </div>

                {/* Category Filters */}
                <div className="flex flex-wrap gap-2 mb-8">
                    {categories.map((category, index) => (
                        <button
                            key={category.id}
                            className={`px-4 py-2 rounded-full font-medium transition-colors ${index === 0
                                    ? 'bg-red-600 text-white shadow-lg'
                                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                                }`}
                        >
                            {category.name}
                            <span className="ml-2 text-sm opacity-75">({category.count})</span>
                        </button>
                    ))}
                </div>

                {/* Popular Items Section */}
                <div className="mb-12">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">🔥 Popular Items</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {popularProducts.map((product) => (
                            <div key={product.id} className="bg-white rounded-xl shadow-lg overflow-hidden transform hover:scale-105 transition-transform duration-200">
                                <div className="relative">
                                    <img
                                        src={product.image}
                                        alt={product.name}
                                        className="w-full h-48 object-cover"
                                    />
                                    <div className="absolute top-3 left-3">
                                        <span className="bg-red-600 text-white px-2 py-1 rounded-full text-xs font-semibold">
                                            Popular
                                        </span>
                                    </div>
                                    {product.originalPrice && (
                                        <div className="absolute top-3 right-3 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
                                            Save ${(product.originalPrice - product.price).toFixed(2)}
                                        </div>
                                    )}
                                </div>
                                <div className="p-4">
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">{product.name}</h3>
                                    <p className="text-gray-600 text-sm mb-3">{product.description}</p>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl font-bold text-red-600">${product.price}</span>
                                            {product.originalPrice && (
                                                <span className="text-sm text-gray-500 line-through">${product.originalPrice}</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                            <span className="text-sm text-gray-600">{product.rating}</span>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex items-center justify-between">
                                        {/* Show different states for design demonstration */}
                                        {product.id === 1 ? (
                                            // Show quantity controls for first item
                                            <div className="flex items-center gap-3">
                                                <button className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors">
                                                    <Minus className="w-4 h-4" />
                                                </button>
                                                <span className="font-semibold text-lg">2</span>
                                                <button className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 transition-colors">
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            // Show add to cart button for other items
                                            <button className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors font-semibold">
                                                Add to Cart
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* All Products Grid */}
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">All Items</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {products.map((product) => (
                            <div key={product.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300">
                                <div className="relative group">
                                    <img
                                        src={product.image}
                                        alt={product.name}
                                        className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                                    />

                                    {/* Badges */}
                                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                                        {product.badges.map((badge, index) => (
                                            <span
                                                key={index}
                                                className={`px-2 py-1 rounded-full text-xs font-semibold ${badge === 'Bestseller' ? 'bg-red-600 text-white' :
                                                        badge === 'New' ? 'bg-green-600 text-white' :
                                                            badge === 'Spicy' ? 'bg-orange-600 text-white' :
                                                                badge === 'Popular' ? 'bg-purple-600 text-white' :
                                                                    badge === 'Premium' ? 'bg-yellow-600 text-white' :
                                                                        'bg-gray-600 text-white'
                                                    }`}
                                            >
                                                {badge}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Quick Add Overlay */}
                                    <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                        <button className="bg-white text-red-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors transform translate-y-2 group-hover:translate-y-0 duration-300">
                                            Quick Add
                                        </button>
                                    </div>
                                </div>

                                <div className="p-4">
                                    <div className="flex items-start justify-between mb-2">
                                        <h3 className="font-bold text-gray-900 text-lg leading-tight">{product.name}</h3>
                                        <div className="flex items-center gap-1 ml-2">
                                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                            <span className="text-xs text-gray-600">{product.rating}</span>
                                        </div>
                                    </div>

                                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description}</p>

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg font-bold text-red-600">${product.price}</span>
                                            {product.originalPrice && (
                                                <span className="text-xs text-gray-500 line-through">${product.originalPrice}</span>
                                            )}
                                        </div>

                                        {/* Show different button states for design demonstration */}
                                        {product.id <= 2 ? (
                                            // Show quantity controls for first two items
                                            <div className="flex items-center gap-2">
                                                <button className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors">
                                                    <Minus className="w-3 h-3" />
                                                </button>
                                                <span className="font-semibold min-w-[20px] text-center">1</span>
                                                <button className="w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 transition-colors">
                                                    <Plus className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ) : (
                                            // Show add button for other items
                                            <button className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 transition-colors">
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Floating Cart Button */}
            <div className="fixed bottom-6 right-6 z-50">
                <button className="bg-red-600 text-white p-4 rounded-full shadow-2xl hover:bg-red-700 transition-colors">
                    <div className="relative">
                        <ShoppingCart className="w-6 h-6" />
                        <span className="absolute -top-2 -right-2 bg-yellow-400 text-red-900 rounded-full w-5 h-5 text-xs font-bold flex items-center justify-center">
                            3
                        </span>
                    </div>
                </button>
            </div>
        </div>
    );
};

// Main App Component - Design Only
const App = () => {
    return (
        <div>
            <Navbar />
            <FastFoodProducts />
        </div>
    );
};

export default App;