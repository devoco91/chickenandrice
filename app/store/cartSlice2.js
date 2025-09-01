import { createSlice } from "@reduxjs/toolkit"

const initialState = {
  cartItem: [],
}

const cartSlice2 = createSlice({
  name: "cart2",
  initialState,
  reducers: {
    addItemCart2: (state, action) => {
      const { _id, category } = action.payload
      const existingItem = state.cartItem.find(
        (product) => product._id === _id && product.category === category
      )

      if (existingItem) {
        if (category === "food") {
          existingItem.portion += 1
        } else {
          existingItem.quantity += 1
        }
      } else {
        state.cartItem.push({
          ...action.payload,
          quantity: category === "food" ? 0 : 1,
          portion: category === "food" ? 1 : 0,
        })
      }
    },

    removeItemCart2: (state, action) => {
      const { id, category } = action.payload
      state.cartItem = state.cartItem.filter(
        (product) => !(product._id === id && product.category === category)
      )
    },

    clearCart2: (state) => {
      state.cartItem = []
    },

    // Direct set
    updateQuantityCart2: (state, action) => {
      const { itemId, quantity, portion } = action.payload
      const item = state.cartItem.find((product) => product._id === itemId)
      if (item) {
        if (item.category === "food" && portion !== undefined) {
          item.portion = portion
        } else if (item.category !== "food" && quantity !== undefined) {
          item.quantity = quantity
        }
      }
    },

    // Step -1 (does not auto-delete; caller decides when to remove)
    decrementQuantity2: (state, action) => {
      const { id, category } = action.payload
      const item = state.cartItem.find(
        (product) => product._id === id && product.category === category
      )
      if (!item) return

      if (item.category === "food" && item.portion > 1) {
        item.portion--
      } else if (item.category !== "food" && item.quantity > 1) {
        item.quantity--
      }
    },

    // Step +1
    incrementQuantity2: (state, action) => {
      const { id, category } = action.payload
      const item = state.cartItem.find(
        (product) => product._id === id && product.category === category
      )
      if (!item) return

      if (item.category === "food") {
        item.portion++
      } else {
        item.quantity++
      }
    },
  },
})

export default cartSlice2.reducer
export const {
  addItemCart2,
  removeItemCart2,
  clearCart2,
  updateQuantityCart2,
  decrementQuantity2,
  incrementQuantity2,
} = cartSlice2.actions
