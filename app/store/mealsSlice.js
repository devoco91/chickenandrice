// store/mealsSlice.js
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  meals: [], // Holds meals for homepage rendering
};

const mealsSlice = createSlice({
  name: "meals",
  initialState,
  reducers: {
    setMeals: (state, action) => {
      state.meals = action.payload || [];
    },
    clearMeals: (state) => {
      state.meals = [];
    },
    // ✅ Reset meals completely to initial state
    resetMeals: () => initialState,
  },
});

export const { setMeals, clearMeals, resetMeals } = mealsSlice.actions;
export default mealsSlice.reducer;
