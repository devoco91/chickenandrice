import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isConfirmed: false,
};

const locationSlice = createSlice({
  name: 'location',
  initialState,
  reducers: {
    confirmLocation(state) {
      state.isConfirmed = true;
    },
    resetLocation(state) {
      state.isConfirmed = false;
    },
    setLocationFromStorage(state, action) {
      state.isConfirmed = action.payload;
    },
  },
});

export const { confirmLocation, resetLocation, setLocationFromStorage } = locationSlice.actions;
export default locationSlice.reducer;
