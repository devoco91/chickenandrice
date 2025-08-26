import { configureStore, combineReducers } from "@reduxjs/toolkit";
import cartSlice from "./cartSlice";
import locationSlice from "./locationSlice";
import orderSlice from "./orderSlice";
import mealsSlice from "./mealsSlice";

import storage from "redux-persist/lib/storage";
import { persistReducer, persistStore } from "redux-persist";

// --- Combine reducers ---
const appReducer = combineReducers({
  cart: cartSlice,
  location: locationSlice,
  order: orderSlice,
  meals: mealsSlice,
});

// --- Root reducer with logout reset ---
const rootReducer = (state, action) => {
  if (action.type === "auth/logout") {
    // ✅ Clear persisted state on logout
    storage.removeItem("persist:root");
    state = undefined;
  }
  return appReducer(state, action);
};

// --- Persist config ---
const persistConfig = {
  key: "root",
  storage,
  whitelist: ["cart", "order", "location"], // ✅ location persists too
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

// --- Store setup ---
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export const persistor = persistStore(store);
