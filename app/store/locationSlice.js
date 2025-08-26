import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isConfirmed: false, // ✅ whether user has confirmed location
  state: "",          // ✅ selected state
  lga: "",            // ✅ selected LGA
};

const locationSlice = createSlice({
  name: "location",
  initialState,
  reducers: {
    // ✅ Save location and mark it confirmed
    setLocation(state, action) {
      const { state: selectedState, lga } = action.payload;
      state.isConfirmed = true;
      state.state = selectedState;
      state.lga = lga;
    },

    // ✅ Reset location (used on logout or manual change)
    resetLocation(state) {
      state.isConfirmed = false;
      state.state = "";
      state.lga = "";
    },
  },
});

export const { setLocation, resetLocation } = locationSlice.actions;
export default locationSlice.reducer;
