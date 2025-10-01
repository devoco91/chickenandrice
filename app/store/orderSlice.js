// app/store/orderSlice.js
import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  name: '',
  address: '',
  phone: '',
  notes: '',
  subtotal: 0,          // items only
  deliveryFee: 0,
  tax: 0,               // 2% of items only
  total: 0,             // subtotal + delivery + tax

  deliveryMethod: 'pickup',
  packagingCost: 0,
  packagingCount: 0,
  deliveryDistanceKm: 0,
  location: null,                 // { type:'Point', coordinates:[lng,lat] }
  customerName: '',
  houseNumber: '',
  street: '',
  landmark: '',
  specialNotes: '',
  addressSaved: false,            // gate for cart CTAs
}

const orderSlice = createSlice({
  name: 'order',
  initialState,
  reducers: {
    setOrderDetails: (state, action) => ({ ...state, ...action.payload }),
    clearOrderDetails: () => initialState,
  },
})

export const { setOrderDetails, clearOrderDetails } = orderSlice.actions
export default orderSlice.reducer
