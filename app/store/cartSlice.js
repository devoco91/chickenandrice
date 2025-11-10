// app/store/cartSlice.js
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  cartItem: [],
  couponCode: "",
  discount: 0,
};

// First add qty
const firstAddQty = (item) => {
  if (!item) return 1;
  if (item.isBulk === true) {
    const n = Number(item.bulkInitialQty);
    return Number.isFinite(n) && n > 0 ? n : 25;
  }
  if (String(item.category || "").toLowerCase() === "bulk") return 25;
  return 1;
};

// Min allowed qty (bulk can't go below 25)
const minAllowedQty = (item) => {
  if (!item) return 1;
  if (item.isBulk === true) return 25;
  if (String(item.category || "").toLowerCase() === "bulk") return 25;
  return 1;
};

const cartSlice = createSlice({
  name: "Cart Item",
  initialState,
  reducers: {
    // First add => 25 for bulk, 1 otherwise. Subsequent adds => +1
    addItemCart: (state, action) => {
      const item = action.payload;
      const existing = state.cartItem.find((p) => p._id === item._id);
      if (existing) {
        existing.quantity += 1;
      } else {
        state.cartItem.push({ ...item, quantity: firstAddQty(item) });
      }
    },
    removeItemCart: (state, action) => {
      state.cartItem = state.cartItem.filter((p) => p._id !== action.payload);
    },
    clearCart: (state) => { state.cartItem = []; },
    resetCart: () => initialState,

    // Explicit updates: clamp to min allowed to avoid bypassing via input fields
    updateQuantityCart: (state, action) => {
      const { itemId, quantity } = action.payload;
      const item = state.cartItem.find((p) => p._id === itemId);
      if (item) {
        const minQ = minAllowedQty(item);
        const q = Number(quantity);
        item.quantity = Number.isFinite(q) ? Math.max(q, minQ) : item.quantity;
      }
    },

    checkoutCart: (state) => { state.cartItem = []; },

    // Decrement: never below 25 for bulk; never below 1 for non-bulk
    decrementQuantity: (state, action) => {
      const item = state.cartItem.find((p) => p._id === action.payload);
      if (!item) return;
      const minQ = minAllowedQty(item);
      if (item.quantity > minQ) {
        item.quantity -= 1;
      }
      // else: stay at minQ (no-op)
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
