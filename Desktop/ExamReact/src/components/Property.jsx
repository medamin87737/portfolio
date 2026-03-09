import { useMemo, useState } from 'react'
import { useRatingStore } from '../store/ratingStore.js'

const EMPTY_RATINGS = []

export function Property({ property, onReserve }) {
  const [showRating, setShowRating] = useState(false)
  const [selectedRating, setSelectedRating] = useState('5')

  const ratings = useRatingStore((s) => s.ratingsByPropertyId[String(property.id)] ?? EMPTY_RATINGS)
  const addRating = useRatingStore((s) => s.addRating)

  const average = useMemo(() => {
    if (ratings.length === 0) return 0
    const sum = ratings.reduce((acc, n) => acc + n, 0)
    return sum / ratings.length
  }, [ratings])

  const averageLabel = useMemo(() => {
    if (ratings.length === 0) return '—'
    return average.toFixed(2)
  }, [average, ratings.length])

  return (
    <article className="card">
      <img className="cardImg" src={property.imageUrl} alt={property.title} />
      <div className="cardBody">
        <div className="cardHeader">
          <div>
            <h3 className="cardTitle">{property.title}</h3>
            <div className="muted">{property.location}</div>
          </div>
          <div className="price">{property.price} DT/jour</div>
        </div>

        <p className="desc">{property.description}</p>

        <div className="metaRow">
          <span className="badge">Vues: {property.views}</span>
          <span className={property.available ? 'badge ok' : 'badge no'}>
            {property.available ? 'Disponible' : 'Indisponible'}
          </span>
          <span className="badge">Moyenne: {averageLabel}</span>
        </div>

        <div className="actions">
          {property.available && (
            <button className="btn primary" onClick={() => onReserve(property)}>
              Réserver la propriété
            </button>
          )}

          <button className="btn" onClick={() => setShowRating((v) => !v)}>
            Ajouter une évaluation
          </button>
        </div>

        {showRating && (
          <div className="ratingBox">
            <select
              className="select"
              value={selectedRating}
              onChange={(e) => setSelectedRating(e.target.value)}
            >
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
            </select>
            <button
              className="btn primary"
              onClick={() => {
                addRating(property.id, Number(selectedRating))
              }}
            >
              Ajouter
            </button>
          </div>
        )}
      </div>
    </article>
  )
}

