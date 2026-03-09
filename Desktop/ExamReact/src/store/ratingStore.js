import { create } from 'zustand'

/**
 * ratingsByPropertyId: { [propertyId: string]: number[] }
 */
export const useRatingStore = create((set, get) => ({
  ratingsByPropertyId: {},

  addRating: (propertyId, rating) => {
    const key = String(propertyId)
    let nextArr = null

    set((state) => {
      const prev = state.ratingsByPropertyId[key] ?? []
      nextArr = [...prev, rating]
      return {
        ratingsByPropertyId: {
          ...state.ratingsByPropertyId,
          [key]: nextArr,
        },
      }
    })

    // Part B requirement: log rating + average
    const arr = nextArr ?? (get().ratingsByPropertyId[key] ?? [])
    const sum = arr.reduce((acc, n) => acc + n, 0)
    const average = arr.length === 0 ? 0 : sum / arr.length
    // eslint-disable-next-line no-console
    console.log('Rating ajouté:', { propertyId, rating, average })

    if (average > 4.5) {
      // eslint-disable-next-line no-alert
      alert('Propriété excellente !')
    }
  },
}))

