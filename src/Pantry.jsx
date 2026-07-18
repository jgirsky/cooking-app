import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

const STATUS_LABELS = { have: 'Have', low: 'Low', out: 'Out' }
const STATUS_ORDER = ['have', 'low', 'out']

function Pantry() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [newIngredientName, setNewIngredientName] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    loadItems()
  }, [])

  async function loadItems() {
    setLoading(true)
    const { data, error } = await supabase
      .from('pantry_items')
      .select('id, status, ingredients(id, name)')
      .order('id')

    if (error) {
      setErrorMessage(`Couldn't load pantry: ${error.message}`)
    } else {
      const sorted = (data || []).slice().sort((a, b) => (a.ingredients?.name || '').localeCompare(b.ingredients?.name || ''))
      setItems(sorted)
    }
    setLoading(false)
  }

  async function findOrCreateIngredientId(name) {
    const trimmed = name.trim()
    const { data: existing, error: findError } = await supabase
      .from('ingredients')
      .select('id')
      .ilike('name', trimmed)
      .maybeSingle()

    if (findError) throw findError
    if (existing) return existing.id

    const { data: created, error: createError } = await supabase
      .from('ingredients')
      .insert({ name: trimmed })
      .select('id')
      .single()

    if (createError) throw createError
    return created.id
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (!newIngredientName.trim()) return
    setAdding(true)
    setErrorMessage('')
    try {
      const ingredientId = await findOrCreateIngredientId(newIngredientName)
      const { error } = await supabase
        .from('pantry_items')
        .upsert({ ingredient_id: ingredientId, status: 'have' }, { onConflict: 'ingredient_id' })
      if (error) throw error
      setNewIngredientName('')
      await loadItems()
    } catch (err) {
      setErrorMessage(`Couldn't add: ${err.message}`)
    } finally {
      setAdding(false)
    }
  }

  async function cycleStatus(item) {
    const currentIndex = STATUS_ORDER.indexOf(item.status)
    const nextStatus = STATUS_ORDER[(currentIndex + 1) % STATUS_ORDER.length]
    await supabase.from('pantry_items').update({ status: nextStatus, updated_at: new Date().toISOString() }).eq('id', item.id)
    await loadItems()
  }

  async function removeItem(item) {
    await supabase.from('pantry_items').delete().eq('id', item.id)
    await loadItems()
  }

  return (
    <div>
      <h2 style={{ marginBottom: '0.25rem' }}>Pantry</h2>
      <p style={{ color: '#555', fontSize: '0.9rem', marginTop: 0 }}>
        Staples you keep on hand. The grocery list will leave off anything marked "Have."
      </p>

      <form onSubmit={handleAdd} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input
          type="text"
          value={newIngredientName}
          onChange={(e) => setNewIngredientName(e.target.value)}
          placeholder="e.g. olive oil, rice, salt"
          style={inputStyle}
        />
        <button type="submit" disabled={adding} style={buttonStyle}>
          + Add
        </button>
      </form>

      {loading && <p>Loading...</p>}
      {errorMessage && <p style={{ color: '#b3261e' }}>{errorMessage}</p>}
      {!loading && items.length === 0 && !errorMessage && (
        <p style={{ color: '#555' }}>Nothing in your pantry yet.</p>
      )}

      <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {items.map((item) => (
          <li key={item.id} style={rowStyle}>
            <span style={{ flex: 1 }}>{item.ingredients?.name}</span>
            <button type="button" onClick={() => cycleStatus(item)} style={statusButtonStyle(item.status)}>
              {STATUS_LABELS[item.status]}
            </button>
            <button type="button" onClick={() => removeItem(item)} style={removeLinkStyle}>
              remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

const rowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  border: '1px solid #eee',
  borderRadius: '4px',
  padding: '0.5rem 0.75rem',
}

function statusButtonStyle(status) {
  const colors = {
    have: { bg: '#eaf3ee', color: '#2f7a4d' },
    low: { bg: '#fff4e0', color: '#a15c00' },
    out: { bg: '#fdeaea', color: '#b3261e' },
  }
  const c = colors[status] || colors.have
  return {
    padding: '0.25rem 0.6rem',
    fontSize: '0.85rem',
    backgroundColor: c.bg,
    color: c.color,
    border: 'none',
    borderRadius: '999px',
    cursor: 'pointer',
  }
}

const removeLinkStyle = {
  background: 'none',
  border: 'none',
  color: '#b3261e',
  cursor: 'pointer',
  fontSize: '0.85rem',
  padding: 0,
}

const inputStyle = {
  padding: '0.5rem',
  fontSize: '1rem',
  border: '1px solid #ccc',
  borderRadius: '4px',
  fontFamily: 'inherit',
  flex: 1,
}

const buttonStyle = {
  padding: '0.5rem 1rem',
  fontSize: '0.95rem',
  backgroundColor: '#2f7a4d',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
}

export default Pantry
