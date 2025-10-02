// app/store/orderSlice.js
import { createSlice } from '@reduxjs/toolkit'

const TAX_RATE = 0.02

const round2 = (n) => Math.round((Number.isFinite(n) ? n : 0) * 100) / 100
const money = (n) => Math.max(0, round2(n)) // why: prevent negative totals
const num = (n, d = 0) => (Number.isFinite(+n) ? +n : d)

const calcSubtotal = (items = []) =>
  items.reduce((s, it) => s + num(it?.price) * num(it?.quantity, 0), 0)

const calcTax = (subtotal) => money(subtotal * TAX_RATE)
const calcTotal = ({ subtotal, deliveryFee, packagingCost, tax }) =>
  money(num(subtotal) + num(deliveryFee) + num(packagingCost) + num(tax))

const initialState = {
  name: '',
  address: '',
  phone: '',
  notes: '',
  subtotal: 0,
  deliveryFee: 0,
  tax: 0,
  total: 0,

  deliveryMethod: 'pickup',
  packagingCost: 0,
  packagingCount: 0,
  deliveryDistanceKm: 0,
  location: null, // { type:'Point', coordinates:[lng,lat] }
  customerName: '',
  houseNumber: '',
  street: '',
  landmark: '',
  specialNotes: '',
  addressSaved: false,
}

const orderSlice = createSlice({
  name: 'order',
  initialState,
  reducers: {
    setOrderDetails: (state, action) => {
      // why: allow patch updates while keeping totals consistent if provided
      const next = { ...state, ...action.payload }
      next.subtotal = money(num(next.subtotal))
      next.deliveryFee = money(num(next.deliveryFee))
      next.packagingCost = money(num(next.packagingCost))
      next.tax = money(num(next.tax))
      next.total = calcTotal(next)
      return next
    },

    clearOrderDetails: () => initialState,

    // === New: keep monetary fields in sync with cart ===
    recalculateFromCart: (state, action) => {
      const items = action?.payload?.items ?? []
      const subtotal = money(calcSubtotal(items))
      const tax = calcTax(subtotal) // 2% of items only
      state.subtotal = subtotal
      state.tax = tax
      state.total = calcTotal(state)
    },

    setDeliveryMethod: (state, action) => {
      state.deliveryMethod = action.payload || 'pickup'
      state.total = calcTotal(state)
    },

    setDeliveryFee: (state, action) => {
      state.deliveryFee = money(action.payload)
      state.total = calcTotal(state)
    },

    setPackaging: (state, action) => {
      const { cost = 0, count = 0 } = action.payload || {}
      state.packagingCost = money(cost)
      state.packagingCount = Math.max(0, Math.trunc(num(count, 0)))
      state.total = calcTotal(state)
    },

    setDeliveryDistanceKm: (state, action) => {
      state.deliveryDistanceKm = Math.max(0, num(action.payload, 0))
    },

    setAddressSaved: (state, action) => {
      state.addressSaved = Boolean(action.payload)
    },
  },
})

export const {
  setOrderDetails,
  clearOrderDetails,
  recalculateFromCart,
  setDeliveryMethod,
  setDeliveryFee,
  setPackaging,
  setDeliveryDistanceKm,
  setAddressSaved,
} = orderSlice.actions

export default orderSlice.reducer
