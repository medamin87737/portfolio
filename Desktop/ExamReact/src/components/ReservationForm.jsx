import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { fetchPropertyById, patchProperty } from '../api.js'

export function ReservationForm() {
  const [searchParams] = useSearchParams()
  const propertyId = searchParams.get('id')

  const [property, setProperty] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [civility, setCivility] = useState('Mr')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const [message, setMessage] = useState('')
  const timeoutRef = useRef(null)

  const navigate = useNavigate()

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  useEffect(() => {
    async function load() {
      if (!propertyId) {
        setError('Aucune propriété sélectionnée.')
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const data = await fetchPropertyById(propertyId)
        setProperty(data)
      } catch (e) {
        setError(e?.message ?? 'Erreur de chargement')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [propertyId])

  const totalPrice = useMemo(() => {
    if (!property?.price || !startDate || !endDate) return null
    const days = Math.ceil(
      (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24),
    )
    if (!Number.isFinite(days) || days <= 0) return null
    return days * property.price
  }, [property?.price, startDate, endDate])

  async function onSubmit(e) {
    e.preventDefault()
    if (!property) return
    if (!startDate || !endDate) {
      // eslint-disable-next-line no-alert
      alert('Veuillez choisir les dates.')
      return
    }

    const days = Math.ceil(
      (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24),
    )
    if (!Number.isFinite(days) || days <= 0) {
      // eslint-disable-next-line no-alert
      alert('Durée invalide.')
      return
    }

    const price = days * property.price

    try {
      // Part A: property becomes unavailable after validation
      await patchProperty(property.id, { available: false })

      // a) reset form
      setCivility('Mr')
      setFirstName('')
      setLastName('')
      setStartDate('')
      setEndDate('')

      // c) show message
      setMessage(
        `${civility} ${firstName} ${lastName} votre réservation pour la propriété ${property.title} est confirmée pour un prix de ${price} DT.`,
      )

      // d) redirect after 5 seconds
      timeoutRef.current = setTimeout(() => {
        navigate('/')
      }, 5000)
    } catch (e2) {
      // eslint-disable-next-line no-alert
      alert(e2?.message ?? "Impossible de valider la réservation")
    }
  }

  if (loading) return <div className="muted">Chargement...</div>
  if (error) return <div className="error">{error}</div>
  if (!property) return null

  return (
    <section className="page">
      <div className="pageHeader">
        <h2>Réservation</h2>
      </div>

      {message ? (
        <div className="success">{message}</div>
      ) : (
        <form className="form" onSubmit={onSubmit}>
          <div className="field">
            <label className="label">Propriété</label>
            <div className="readonly">{property.title}</div>
          </div>

          <div className="row">
            <div className="field">
              <label className="label">Civilité</label>
              <select
                className="select"
                value={civility}
                onChange={(e) => setCivility(e.target.value)}
              >
                <option value="Mr">Mr</option>
                <option value="Mme">Mme</option>
              </select>
            </div>
            <div className="field">
              <label className="label">Nom</label>
              <input
                className="input"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label className="label">Prénom</label>
              <input
                className="input"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="row">
            <div className="field">
              <label className="label">Date début</label>
              <input
                className="input"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label className="label">Date fin</label>
              <input
                className="input"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="metaRow">
            <span className="badge">Prix/jour: {property.price} DT</span>
            <span className="badge">
              Total: {totalPrice === null ? '—' : `${totalPrice} DT`}
            </span>
          </div>

          <div className="actions">
            <button className="btn primary" type="submit">
              Valider
            </button>
            <button className="btn" type="button" onClick={() => navigate('/')}>
              Annuler
            </button>
          </div>
        </form>
      )}
    </section>
  )
}

