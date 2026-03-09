import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchProperties, patchProperty } from '../api.js'
import { Property } from './Property.jsx'

export function Properties() {
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')

  const navigate = useNavigate()

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchProperties()
      setProperties(data)
    } catch (e) {
      setError(e?.message ?? 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    const min = minPrice === '' ? null : Number(minPrice)
    const max = maxPrice === '' ? null : Number(maxPrice)

    return properties.filter((p) => {
      if (Number.isFinite(min) && p.price < min) return false
      if (Number.isFinite(max) && p.price > max) return false
      return true
    })
  }, [properties, minPrice, maxPrice])

  async function handleReserve(property) {
    // Part A: increment views then redirect to /reserve
    try {
      await patchProperty(property.id, { views: (property.views ?? 0) + 1 })
      navigate(`/reserve?id=${property.id}`)
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert(e?.message ?? "Impossible de réserver pour l'instant")
    }
  }

  return (
    <section className="page">
      <div className="pageHeader">
        <h2>Liste des propriétés</h2>
        <button className="btn" onClick={load}>
          Rafraîchir
        </button>
      </div>

      <div className="filters">
        <div className="field">
          <label className="label">Prix min</label>
          <input
            className="input"
            type="number"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="field">
          <label className="label">Prix max</label>
          <input
            className="input"
            type="number"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="1000"
          />
        </div>
      </div>

      {loading && <div className="muted">Chargement...</div>}
      {error && <div className="error">{error}</div>}

      <div className="grid">
        {filtered.map((p) => (
          <Property key={p.id} property={p} onReserve={handleReserve} />
        ))}
      </div>
    </section>
  )
}

