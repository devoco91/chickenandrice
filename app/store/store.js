// app/store/store.js
import { configureStore, combineReducers } from "@reduxjs/toolkit";
import cartSlice from "./cartSlice";       // online buyers (now bulk-aware)
import cartSlice2 from "./cartSlice2";     // in-store buyers
import locationSlice from "./locationSlice";
import orderSlice from "./orderSlice";
import mealsSlice from "./mealsSlice";

import storage from "./persistStorage"; // ✅ use SSR-safe storage
import { persistReducer, persistStore } from "redux-persist";

// --- Individual persist configs ---
const cartPersistConfig = { key: "cart", storage };     // online cart
const cart2PersistConfig = { key: "cart2", storage };   // in-shop cart
const locationPersistConfig = { key: "location", storage };
const orderPersistConfig = { key: "order", storage };

// --- Combine reducers ---
const appReducer = combineReducers({
  cart: persistReducer(cartPersistConfig, cartSlice),          // online
  cart2: persistReducer(cart2PersistConfig, cartSlice2),       // cashier
  location: persistReducer(locationPersistConfig, locationSlice),
  order: persistReducer(orderPersistConfig, orderSlice),
  meals: mealsSlice, // not persisted
});

// --- Root reducer with selective reset ---
const rootReducer = (state, action) => {
  if (action.type === "auth/logout") {
    // reset only ONLINE-related slices; leave cart2
    storage.removeItem("persist:cart");
    storage.removeItem("persist:location");
    storage.removeItem("persist:order");
    return appReducer(
      {
        ...state,
        cart: undefined,
        location: undefined,
        order: undefined,
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
      // keep simple; or set ignoredActions if you turn serializableCheck back on
      serializableCheck: false,
    }),
});

export const persistor = persistStore(store);
