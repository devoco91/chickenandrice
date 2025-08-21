import { configureStore, combineReducers } from "@reduxjs/toolkit";
import cartSlice from "./cartSlice";
import locationSlice from "./locationSlice";
import orderSlice from "./orderSlice";
import mealsSlice from "./mealsSlice";

import storage from "redux-persist/lib/storage"; 
import { persistReducer, persistStore } from "redux-persist";

const rootReducer = combineReducers({
  cart: cartSlice,
  location: locationSlice,
  order: orderSlice,
  meals: mealsSlice,
});

const persistConfig = {
  key: "root",
  storage,
  whitelist: ["cart", "order"],  
  // ❌ removed "location" so location must always be re-confirmed
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export const persistor = persistStore(store);
