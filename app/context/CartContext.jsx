"use client"
import { createContext, useContext, useState } from "react"

const CartContext = createContext()

export function CartProvider({ children }) {
  const [cart, setCart] = useState([])

  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find(i => i._id === item._id && i.category === item.category)
      if (existing) {
        // If same item exists, update its portion/quantity
        return prev.map(i =>
          i._id === item._id && i.category === item.category
            ? { ...i, portion: item.portion ?? i.portion, quantity: item.quantity ?? i.quantity }
            : i
        )
      }
      return [...prev, item]
    })
  }

  const updateCart = (id, category, updates) => {
    setCart(prev =>
      prev.map(i =>
        i._id === id && i.category === category ? { ...i, ...updates } : i
      )
    )
  }

  const removeFromCart = (id, category) => {
    setCart(prev => prev.filter(i => !(i._id === id && i.category === category)))
  }

  return (
    <CartContext.Provider value={{ cart, addToCart, updateCart, removeFromCart }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  return useContext(CartContext)
}
