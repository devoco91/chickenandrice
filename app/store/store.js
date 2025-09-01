import { configureStore, combineReducers } from "@reduxjs/toolkit";
import cartSlice from "./cartSlice";       // online buyers
import cartSlice2 from "./cartSlice2";     // in-store buyers
import locationSlice from "./locationSlice";
import orderSlice from "./orderSlice";
import mealsSlice from "./mealsSlice";

import storage from "redux-persist/lib/storage";
import { persistReducer, persistStore } from "redux-persist";

// --- Individual persist configs ---
const cartPersistConfig = {
  key: "cart",   // online cart
  storage,
};

const cart2PersistConfig = {
  key: "cart2",  // in-shop cart
  storage,
};

const locationPersistConfig = {
  key: "location",
  storage,
};

const orderPersistConfig = {
  key: "order",
  storage,
};

// --- Combine reducers ---
const appReducer = combineReducers({
  cart: persistReducer(cartPersistConfig, cartSlice),      // online
  cart2: persistReducer(cart2PersistConfig, cartSlice2),   // cashier
  location: persistReducer(locationPersistConfig, locationSlice),
  order: persistReducer(orderPersistConfig, orderSlice),
  meals: mealsSlice, // no need to persist meals
});

// --- Root reducer with selective reset ---
const rootReducer = (state, action) => {
  if (action.type === "auth/logout") {
    // ✅ Reset only ONLINE buyer's cart + online-related slices
    storage.removeItem("persist:cart");
    storage.removeItem("persist:location");
    storage.removeItem("persist:order");

    return appReducer(
      {
        ...state,
        cart: undefined,
        location: undefined,
        order: undefined,
        // 👈 leave cart2 (cashier) untouched
      },
      action
    );
  }
  return appReducer(state, action);
};

// --- Store setup ---
export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export const persistor = persistStore(store);
