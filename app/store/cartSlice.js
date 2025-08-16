import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  cartItem: [],
  couponCode: "",
  discount: 0,
};

const cartSlice = createSlice({
  name: "Cart Item",
  initialState: initialState,
  reducers: {
    // Add item to cart
    addItemCart: (state, action) => {
      const item = action.payload;
      const existingItem = state.cartItem.find((product) => product._id === item._id);
      if (existingItem) {
        existingItem.quantity++;
      } else {
        state.cartItem.push({ ...item, quantity: 1 });
      }
    },

    // Remove item from cart
    removeItemCart: (state, action) => {
      const itemId = action.payload;
      state.cartItem = state.cartItem.filter((product) => product._id !== itemId);
    },

    // Clear all items
    clearCart: (state) => {
      state.cartItem = [];
    },

    // Update item quantity directly
    updateQuantityCart: (state, action) => {
      const { itemId, quantity } = action.payload;
      const item = state.cartItem.find((product) => product._id === itemId);
      if (item) {
        item.quantity = quantity;
      }
    },

    // Checkout (clear cart)
    checkoutCart: (state) => {
      state.cartItem = [];
    },

    // Decrement quantity
    decrementQuantity: (state, action) => {
      const itemId = action.payload;
      const item = state.cartItem.find((product) => product._id === itemId);
      if (item && item.quantity > 1) {
        item.quantity--;
      }
    },

    // Increment quantity
    incrementQuantity: (state, action) => {
      const itemId = action.payload;
      const item = state.cartItem.find((product) => product._id === itemId);
      if (item) {
        item.quantity++;
      }
    },

    // Apply coupon code
    applyCouponCode: (state, action) => {
      const { couponCode } = action.payload;
      state.couponCode = couponCode;
    },

    // Remove coupon code
    removeCouponCode: (state) => {
      state.couponCode = "";
    },

    // Apply discount
    applyDiscount: (state, action) => {
      const { discount } = action.payload;
      state.discount = discount;
    },
  },
});

export default cartSlice.reducer;

export const {
  addItemCart,
  removeItemCart,
  clearCart,
  updateQuantityCart,
  checkoutCart,
  decrementQuantity,
  incrementQuantity,
  applyCouponCode,
  removeCouponCode,
  applyDiscount,
} = cartSlice.actions;
