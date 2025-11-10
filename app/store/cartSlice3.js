// app/store/cartSlice3.js
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  cartItem: [],
  couponCode: "",
  discount: 0,
};

const firstAddQty = (item) => {
  if (!item) return 1;
  // ✅ bulk-aware first add
  if (item.isBulk === true) {
    const n = Number(item.bulkInitialQty);
    return Number.isFinite(n) && n > 0 ? n : 25;
  }
  // allow legacy detection by category label if ever used
  if (String(item.category || "").toLowerCase() === "bulk") return 25;
  return 1;
};

const cartSlice3 = createSlice({
  name: "Cart Item",
  initialState,
  reducers: {
    addItemCart: (state, action) => {
      const item = action.payload;
      const existing = state.cartItem.find((p) => p._id === item._id);
      if (existing) {
        existing.quantity += 1; // ✅ subsequent adds
      } else {
        state.cartItem.push({ ...item, quantity: firstAddQty(item) }); // ✅ first add
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
      if (item) item.quantity = Number(quantity);
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

export default cartSlice3.reducer;

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
} = cartSlice3.actions;
