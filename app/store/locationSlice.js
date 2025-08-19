import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isConfirmed: false,
  state: "",
  lga: "",
};

const locationSlice = createSlice({
  name: "location",
  initialState,
  reducers: {
    setLocation(state, action) {
      const { state: selectedState, lga } = action.payload;
      state.isConfirmed = true;
      state.state = selectedState;
      state.lga = lga;
    },
    resetLocation(state) {
      state.isConfirmed = false;
      state.state = "";
      state.lga = "";
    },
    setLocationFromStorage(state, action) {
      state.isConfirmed = true;
      state.state = action.payload.state;
      state.lga = action.payload.lga;
    },
  },
});

export const { setLocation, resetLocation, setLocationFromStorage } =
  locationSlice.actions;
export default locationSlice.reducer;
