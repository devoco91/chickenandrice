// app/store/cartSlice.js
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  cartItem: [],
  couponCode: "",
  discount: 0,
};

const cartSlice = createSlice({
  name: "Cart Item",
  initialState,
  reducers: {
    // First add => 1 for all items (min 3 packs is enforced at checkout UI, not here)
    addItemCart: (state, action) => {
      const item = action.payload;
      const existing = state.cartItem.find((p) => p._id === item._id);
      if (existing) {
        existing.quantity += 1;
      } else {
        // why: prevent unexpected jump to 3 on the first add
        state.cartItem.push({ ...item, quantity: 1 });
      }
    },
    removeItemCart: (state, action) => {
      state.cartItem = state.cartItem.filter((p) => p._id !== action.payload);
    },
    clearCart: (state) => { state.cartItem = []; },
    resetCart: () => initialState,
    updateQuantityCart: (state, action) => {
      const { itemId, quantity } = action.payload;
      const item = state.cartItem.find((p) => p._id === itemId);
      if (item) item.quantity = quantity;
    },
    checkoutCart: (state) => { state.cartItem = []; },
    decrementQuantity: (state, action) => {
      const item = state.cartItem.find((p) => p._id === action.payload);
      if (item && item.quantity > 1) item.quantity -= 1;
    },
    incrementQuantity: (state, action) => {
      const item = state.cartItem.find((p) => p._id === action.payload);
      if (item) item.quantity += 1;
    },
    applyCouponCode: (state, action) => { state.couponCode = action.payload.couponCode; },
    removeCouponCode: (state) => { state.couponCode = ""; },
    applyDiscount: (state, action) => { state.discount = action.payload.discount; },
  },
});

export default cartSlice.reducer;

export const {
  addItemCart,
  removeItemCart,
  clearCart,
  resetCart,
  updateQuantityCart,
  checkoutCart,
  decrementQuantity,
  incrementQuantity,
  applyCouponCode,
  removeCouponCode,
  applyDiscount,
} = cartSlice.actions;
