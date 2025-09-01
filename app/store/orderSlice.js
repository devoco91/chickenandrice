import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  name: '',
  address: '',
  phone: '',
  notes: '',
  subtotal: 0,
  deliveryFee: 0,
  tax: 0,
  total: 0,
}

const orderSlice = createSlice({
  name: 'order',
  initialState,
  reducers: {
    setOrderDetails: (state, action) => {
      return { ...state, ...action.payload }
    },
    clearOrderDetails: () => initialState,
  },
})

export const { setOrderDetails, clearOrderDetails } = orderSlice.actions
export default orderSlice.reducer
