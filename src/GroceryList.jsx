import { useState } from 'react'
import { supabase } from './supabaseClient'

function toISODate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getMonday(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function GroceryList() {
  const [startDate, setStartDate] = useState(() => toISODate(getMonday(new Date())))
  const [endDate, setEndDate] = useState(() => toISODate(addDays(getMonday(new Date()), 6)))
  const [needToBuy, setNeedToBuy] = useState(null)
  const [alreadyHave, setAlreadyHave] = useState(null)
  const [checkedNames, setCheckedNames] = useState(new Set())
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  function setThisWeek() {
    const monday = getMonday(new Date())
    setStartDate(toISODate(monday))
    setEndDate(toISODate(addDays(monday, 6)))
  }

  async function handleGenerate() {
    setLoading(true)
    setErrorMessage('')
    setCheckedNames(new Set())

    try {
      const { data: slots, error: slotsError } = await supabase
        .from('planned_meals')
        .select('recipe_id, meal_id')
        .gte('plan_date', startDate)
        .lte('plan_date', endDate)
        .neq('status', 'skipped')

      if (slotsError) throw slotsError

      const recipeIds = new Set()
      const mealIds = new Set()
      ;(slots || []).forEach((s) => {
        if (s.recipe_id) recipeIds.add(s.recipe_id)
        if (s.meal_id) mealIds.add(s.meal_id)
      })

      if (mealIds.size > 0) {
        const { data: mealSlots, error: mealSlotsError } = await supabase
          .from('meal_component_slots')
          .select('recipe_id')
          .in('meal_id', [...mealIds])
        if (mealSlotsError) throw mealSlotsError
        ;(mealSlots || []).forEach((ms) => {
          if (ms.recipe_id) recipeIds.add(ms.recipe_id)
        })
      }

      if (recipeIds.size === 0) {
        setNeedToBuy([])
        setAlreadyHave([])
        setLoading(false)
        return
      }

      const { data: recipeIngredients, error: riError } = await supabase
        .from('recipe_ingredients')
        .select('ingredient_id, quantity, unit, ingredients(name)')
        .in('recipe_id', [...recipeIds])
      if (riError) throw riError

      const { data: pantryRows, error: pantryError } = await supabase
        .from('pantry_items')
        .select('ingredient_id, status')
      if (pantryError) throw pantryError

      const haveIds = new Set((pantryRows || []).filter((p) => p.status === 'have').map((p) => p.ingredient_id))

      // Group by ingredient, then by unit within that ingredient (so we only
      // ever sum quantities that share the same unit).
      const grouped = {}
      ;(recipeIngredients || []).forEach((ri) => {
        const id = ri.ingredient_id
        if (!id) return
        const name = ri.ingredients?.name || 'Unknown ingredient'
        if (!grouped[id]) grouped[id] = { name, byUnit: {} }
        const unitKey = ri.unit || '(no unit)'
        if (!grouped[id].byUnit[unitKey]) grouped[id].byUnit[unitKey] = 0
        if (ri.quantity) grouped[id].byUnit[unitKey] += Number(ri.quantity)
        else grouped[id].byUnit[unitKey] = grouped[id].byUnit[unitKey] // leave as-is if no quantity given
      })

      const need = []
      const have = []
      Object.entries(grouped).forEach(([id, info]) => {
        const lines = Object.entries(info.byUnit).map(([unit, qty]) => {
          if (unit === '(no unit)') return qty > 0 ? `${qty}` : ''
          return qty > 0 ? `${qty} ${unit}` : unit
        })
        const entry = { id, name: info.name, detail: lines.filter(Boolean).join(', ') }
        if (haveIds.has(id)) have.push(entry)
        else need.push(entry)
      })

      need.sort((a, b) => a.name.localeCompare(b.name))
      have.sort((a, b) => a.name.localeCompare(b.name))

      setNeedToBuy(need)
      setAlreadyHave(have)
    } catch (err) {
      setErrorMessage(`Couldn't build the list: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  function toggleChecked(name) {
    setCheckedNames((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  return (
    <div>
      <h2 style={{ marginBottom: '0.25rem' }}>Grocery List</h2>
      <p style={{ color: '#555', fontSize: '0.9rem', marginTop: 0 }}>
        Combines ingredients from everything planned in this date range, and leaves off what's already in
        your pantry.
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <label style={{ display: 'flex', flexDirection: 'column', fontSize: '0.85rem', color: '#555' }}>
          From
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', fontSize: '0.85rem', color: '#555' }}>
          To
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} />
        </label>
        <button type="button" onClick={setThisWeek} style={secondaryButtonStyle}>
          This week
        </button>
        <button type="button" onClick={handleGenerate} disabled={loading} style={buttonStyle}>
          {loading ? 'Building...' : 'Build list'}
        </button>
      </div>

      {errorMessage && <p style={{ color: '#b3261e' }}>{errorMessage}</p>}

      {needToBuy !== null && (
        <>
          <h3>Need to buy</h3>
          {needToBuy.length === 0 ? (
            <p style={{ color: '#555' }}>Nothing to buy — either nothing's planned, or you already have it all.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {needToBuy.map((item) => (
                <li key={item.id} style={itemRowStyle}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={checkedNames.has(item.id)}
                      onChange={() => toggleChecked(item.id)}
                    />
                    <span style={checkedNames.has(item.id) ? { textDecoration: 'line-through', color: '#999' } : {}}>
                      {item.name}
                      {item.detail && <span style={{ color: '#777' }}> — {item.detail}</span>}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}

          {alreadyHave.length > 0 && (
            <>
              <h3 style={{ color: '#888', marginTop: '1.5rem' }}>Already have</h3>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {alreadyHave.map((item) => (
                  <li key={item.id} style={{ ...itemRowStyle, color: '#999' }}>
                    {item.name}
                    {item.detail && <span> — {item.detail}</span>}
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  )
}

const itemRowStyle = {
  padding: '0.4rem 0',
  borderBottom: '1px solid #f0f0f0',
}

const inputStyle = {
  padding: '0.4rem',
  fontSize: '0.9rem',
  border: '1px solid #ccc',
  borderRadius: '4px',
  fontFamily: 'inherit',
}

const secondaryButtonStyle = {
  padding: '0.5rem 0.75rem',
  fontSize: '0.9rem',
  backgroundColor: 'white',
  color: '#2f7a4d',
  border: '1px solid #2f7a4d',
  borderRadius: '4px',
  cursor: 'pointer',
  alignSelf: 'flex-end',
}

const buttonStyle = {
  padding: '0.5rem 1rem',
  fontSize: '0.95rem',
  backgroundColor: '#2f7a4d',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  alignSelf: 'flex-end',
}

export default GroceryList
