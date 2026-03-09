import axios from 'axios'

export const api = axios.create({
  baseURL: 'http://localhost:3001',
})

export async function fetchProperties() {
  const res = await api.get('/properties')
  return res.data
}

export async function fetchPropertyById(id) {
  const res = await api.get(`/properties/${id}`)
  return res.data
}

export async function patchProperty(id, partial) {
  const res = await api.patch(`/properties/${id}`, partial)
  return res.data
}

