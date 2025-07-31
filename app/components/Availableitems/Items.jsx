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
        badges: []
    },
    {
        id: 3,
        name: 'BBQ Bacon Burger',
        category: 'burgers',
        price: 13.99,
        description: 'Smoky BBQ sauce, crispy bacon, and onion rings on a beef patty',
        image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT3bIbjHxNKqWe7GVlS7ef5OuyZogTfmLrlUw&s',
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
        badges: ['Chef Special']
    },
    {
        id: 5,
        name: 'Veggie Burger',
        category: 'burgers',
        price: 10.99,
        description: 'Plant-based patty with avocado, sprouts, and garlic aioli',
        image: 'https://images.unsplash.com/photo-1520072959219-c595dc870360?w=400&h=300&fit=crop',
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
        badges: ['Spicy', 'New']
    },
    {
        id: 7,
        name: 'Crispy Chicken Wings',
        category: 'chicken',
        price: 8.99,
        description: '8 pieces of golden crispy wings with your choice of sauce',
        image: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=400&h=300&fit=crop',
        badges: ['Popular']
    },
    {
        id: 8,
        name: 'Chicken Tenders',
        category: 'chicken',
        price: 9.99,
        description: 'Hand-breaded chicken strips with honey mustard dipping sauce',
        image: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=400&h=300&fit=crop',
        badges: ['Kids Favorite']
    },
    {
        id: 9,
        name: 'Buffalo Chicken Wrap',
        category: 'chicken',
        price: 8.49,
        description: 'Spicy buffalo chicken with lettuce, tomatoes in a flour tortilla',
        image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTHVrgVB_vU5sm90DtO8bK0om9lzmijmB6gqw&s',
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
        badges: []
    },
    {
        id: 11,
        name: 'Loaded Fries',
        category: 'classicfries',
        price: 6.99,
        description: 'Crispy fries topped with cheese, bacon bits, and green onions',
        image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&h=300&fit=crop',
        badges: ['Popular']
    },
    {
        id: 12,
        name: 'Sweet Potato Fries',
        category: 'classicfries',
        price: 4.99,
        description: 'Crispy sweet potato fries with cinnamon sugar',
        image: 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=400&h=300&fit=crop',
        badges: ['Healthy']
    },
    {
        id: 13,
        name: 'Curly Fries',
        category: 'classicfries',
        price: 4.49,
        description: 'Seasoned curly fries with paprika and garlic powder',
        image: 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=400&h=300&fit=crop',
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
        badges: []
    },
    {
        id: 15,
        name: 'Vanilla Shake',
        category: 'drinks',
        price: 4.99,
        description: 'Classic vanilla milkshake with real vanilla beans',
        image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSd1smFtshABhrQezZ7q-Q70Ibiy3abYwyGyQ&s',
        badges: []
    },
    {
        id: 16,
        name: 'Fresh Lemonade',
        category: 'drinks',
        price: 2.99,
        description: 'Freshly squeezed lemonade with mint leaves',
        image: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=400&h=300&fit=crop',
        badges: ['Refreshing']
    },
    {
        id: 17,
        name: 'Iced Coffee',
        category: 'drinks',
        price: 3.49,
        description: 'Cold brew coffee with cream and sugar',
        image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&h=300&fit=crop',
        badges: []
    },

    // HOT DOGS
    {
        id: 18,
        name: 'Classic Hot Dog',
        category: 'hotdogs',
        price: 4.99,
        description: 'All-beef hot dog with mustard, ketchup, and onions',
        image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRv6SW-NGjHR8xuYm99UZ9XBF5yc3xU2oCwFuuKFM6Sc5Y59Y_l9sIhCMHrvlR2CPxV2nI&usqp=CAU',
        badges: []
    },
    {
        id: 19,
        name: 'Chili Cheese Dog',
        category: 'hotdogs',
        price: 6.99,
        description: 'Hot dog topped with chili, cheese, and diced onions',
        image: 'https://i.ytimg.com/vi/UL5zpJXLbA0/maxresdefault.jpg',
        badges: ['Popular']
    },
    {
        id: 20,
        name: 'Chicago Style Dog',
        category: 'hotdogs',
        price: 7.49,
        description: 'All-beef hot dog with yellow mustard, onions, relish, tomatoes, pickle, and celery salt',
        image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSG3SET00mhV8DM1jqls9LgyTTdPCnSQP0B9Q&s',
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
        badges: []
    },
    {
        id: 22,
        name: 'Beer Battered Rings',
        category: 'onionrings',
        price: 6.99,
        description: 'Extra crispy beer-battered onion rings with spicy mayo',
        image: 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=400&h=300&fit=crop',
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
        badges: ['Comfort Food']
    },
    {
        id: 24,
        name: 'Cheese Quesadilla',
        category: 'cheese',
        price: 6.49,
        description: 'Grilled tortilla with melted cheese blend and salsa',
        image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQd7X6q1kD70tyYb4G-6yLUS4m5F9S96JUFTA&s',
        badges: []
    },
    {
        id: 25,
        name: 'Cheese Sticks',
        category: 'cheese',
        price: 5.99,
        description: 'Breaded mozzarella sticks with marinara sauce',
        image: 'https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?w=400&h=300&fit=crop',
        badges: ['Appetizer']
    },

    // PIZZA
    {
        id: 26,
        name: 'Margherita Pizza',
        category: 'pizza',
        price: 11.99,
        description: 'Fresh mozzarella, tomatoes, and basil on thin crust',
        image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSb510lsAzgF1n_o98uVaUQICrAZhQXOFpCeA&s',
        badges: ['Classic']
    },
    {
        id: 27,
        name: 'Pepperoni Pizza',
        category: 'pizza',
        price: 12.99,
        description: 'Classic pepperoni with mozzarella cheese',
        image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop',
        badges: ['Popular']
    },
    {
        id: 28,
        name: 'Meat Lovers Pizza',
        category: 'pizza',
        price: 15.99,
        description: 'Pepperoni, sausage, bacon, and ham with cheese',
        image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSZ_TimN743CM-BF9cyAjCvlysSlqKNZH_Dtg&s',
        badges: ['Premium']
    },
    {
        id: 29,
        name: 'Veggie Supreme Pizza',
        category: 'pizza',
        price: 13.99,
        description: 'Bell peppers, mushrooms, onions, olives, and tomatoes',
        image: 'https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?w=400&h=300&fit=crop',
        badges: ['Vegetarian']
    },

    // ADDITIONAL SIDES
    {
        id: 30,
        name: 'Coleslaw',
        category: 'sides',
        price: 2.99,
        description: 'Fresh cabbage slaw with creamy dressing',
        image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRQdyuaa9OlMh9hO3OkjSw6cfAWg7KZKZlSqw&s',
        badges: ['Healthy']
    },
    {
        id: 31,
        name: 'Pickle Spears',
        category: 'sides',
        price: 1.99,
        description: 'Crispy dill pickle spears',
        image: 'https://images.unsplash.com/photo-1583623025817-d180a2221d0a?w=400&h=300&fit=crop',

        badges: []
    },
    {
        id: 32,
        name: 'Garden Salad',
        category: 'sides',
        price: 5.99,
        description: 'Mixed greens with tomatoes, cucumbers, and your choice of dressing',
        image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop',
       
        badges: ['Healthy']
    }
];

export default products