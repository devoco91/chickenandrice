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
  },
});

export const { setMeals, clearMeals } = mealsSlice.actions;
export default mealsSlice.reducer;
