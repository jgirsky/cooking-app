import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

const SLOT_TYPES = ['breakfast', 'lunch', 'dinner', 'snack']
const SLOT_LABELS = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
}

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

// Parsing a "YYYY-MM-DD" string with `new Date(str)` treats it as UTC, which
// can shift by a day depending on the browser's timezone. Parse the parts
// directly so "next day" math stays correct locally.
function parseISODate(str) {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatDayLabel(date) {
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

function WeekPlanner() {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()))
  const [slotsMap, setSlotsMap] = useState({})
  const [recipeOptions, setRecipeOptions] = useState([])
  const [mealOptions, setMealOptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [editingKey, setEditingKey] = useState(null)
  const [selectedValue, setSelectedValue] = useState('')
  const [skipReason, setSkipReason] = useState('')
  const [servingsMade, setServingsMade] = useState('')
  const [servingsPerSitting, setServingsPerSitting] = useState('')
  const [savingSlot, setSavingSlot] = useState(false)

  useEffect(() => {
    loadOptions()
  }, [])

  useEffect(() => {
    loadWeek()
  }, [weekStart])

  async function loadOptions() {
    const [{ data: recipeData }, { data: mealData }] = await Promise.all([
      supabase.from('recipes').select('id, title').order('title'),
      supabase.from('meals').select('id, name').order('name'),
    ])
    setRecipeOptions(recipeData || [])
    setMealOptions(mealData || [])
  }

  async function loadWeek() {
    setLoading(true)
    const start = toISODate(weekStart)
    const end = toISODate(addDays(weekStart, 6))
    const { data, error } = await supabase
      .from('planned_meals')
      .select('*, recipes(title), meals(name)')
      .gte('plan_date', start)
      .lte('plan_date', end)

    if (error) {
      setErrorMessage(`Couldn't load your plan: ${error.message}`)
    } else {
      const map = {}
      ;(data || []).forEach((row) => {
        map[`${row.plan_date}|${row.slot_type}`] = row
      })
      setSlotsMap(map)
      setErrorMessage('')
    }
    setLoading(false)
  }

  function handleOpenEditor(key, row) {
    setEditingKey(key)
    if (!row) {
      setSelectedValue('')
      setSkipReason('')
      setServingsMade('')
      setServingsPerSitting('')
    } else if (row.status === 'skipped') {
      setSelectedValue('skip')
      setSkipReason(row.skip_reason || '')
      setServingsMade('')
      setServingsPerSitting('')
    } else {
      setSelectedValue(row.recipe_id ? `recipe:${row.recipe_id}` : `meal:${row.meal_id}`)
      setSkipReason('')
      setServingsMade(row.servings_made ?? '')
      setServingsPerSitting(row.servings_per_sitting ?? '')
    }
  }

  function handleCancelEdit() {
    setEditingKey(null)
    setSelectedValue('')
    setSkipReason('')
    setServingsMade('')
    setServingsPerSitting('')
  }

  async function handleSaveSlot(dateStr, slotType) {
    setSavingSlot(true)

    if (!selectedValue) {
      const existingRow = slotsMap[`${dateStr}|${slotType}`]
      if (existingRow) {
        await supabase.from('planned_meals').delete().eq('id', existingRow.id)
      }
    } else if (selectedValue === 'skip') {
      await supabase.from('planned_meals').upsert(
        {
          plan_date: dateStr,
          slot_type: slotType,
          recipe_id: null,
          meal_id: null,
          status: 'skipped',
          skip_reason: skipReason.trim() || null,
        },
        { onConflict: 'plan_date,slot_type' }
      )
    } else {
      const [type, id] = selectedValue.split(':')
      const made = servingsMade ? Number(servingsMade) : null
      const perSitting = servingsPerSitting ? Number(servingsPerSitting) : null
      const remaining = made && perSitting ? made - perSitting : null

      const { data: savedRow, error: saveError } = await supabase
        .from('planned_meals')
        .upsert(
          {
            plan_date: dateStr,
            slot_type: slotType,
            recipe_id: type === 'recipe' ? id : null,
            meal_id: type === 'meal' ? id : null,
            status: 'planned',
            skip_reason: null,
            servings_made: made,
            servings_per_sitting: perSitting,
            servings_remaining: remaining,
            is_leftover: false,
            leftover_source_id: null,
          },
          { onConflict: 'plan_date,slot_type' }
        )
        .select()
        .single()

      // If there's more than one sitting's worth left, try to auto-fill
      // tomorrow's lunch with the leftovers (only if that slot is empty).
      if (!saveError && savedRow && remaining && remaining > 0) {
        const nextDateStr = toISODate(addDays(parseISODate(dateStr), 1))
        const { data: existingNextSlot } = await supabase
          .from('planned_meals')
          .select('id')
          .eq('plan_date', nextDateStr)
          .eq('slot_type', 'lunch')
          .maybeSingle()

        if (!existingNextSlot) {
          await supabase.from('planned_meals').insert({
            plan_date: nextDateStr,
            slot_type: 'lunch',
            recipe_id: savedRow.recipe_id,
            meal_id: savedRow.meal_id,
            status: 'planned',
            is_leftover: true,
            leftover_source_id: savedRow.id,
          })

          await supabase
            .from('planned_meals')
            .update({ servings_remaining: remaining - perSitting })
            .eq('id', savedRow.id)
        }
      }
    }

    setEditingKey(null)
    setSelectedValue('')
    setSkipReason('')
    setServingsMade('')
    setServingsPerSitting('')
    await loadWeek()
    setSavingSlot(false)
  }

  async function handleClearSlot(row) {
    await supabase.from('planned_meals').delete().eq('id', row.id)
    await loadWeek()
  }

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0 }}>Weekly Plan</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setWeekStart((prev) => addDays(prev, -7))} style={navButtonStyle}>
            ← Prev
          </button>
          <button onClick={() => setWeekStart(getMonday(new Date()))} style={navButtonStyle}>
            This week
          </button>
          <button onClick={() => setWeekStart((prev) => addDays(prev, 7))} style={navButtonStyle}>
            Next →
          </button>
        </div>
      </div>

      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        {formatDayLabel(days[0])} – {formatDayLabel(days[6])}
      </p>

      {loading && <p>Loading...</p>}
      {errorMessage && <p style={{ color: '#b3261e' }}>{errorMessage}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {days.map((date) => {
          const dateStr = toISODate(date)
          return (
            <div key={dateStr} style={dayCardStyle}>
              <h3 style={{ margin: '0 0 0.5rem 0' }}>{formatDayLabel(date)}</h3>
              {SLOT_TYPES.map((slotType) => {
                const key = `${dateStr}|${slotType}`
                const row = slotsMap[key]
                const isEditing = editingKey === key
                const baseTitle = row ? row.recipes?.title || row.meals?.name : null
                const label = row
                  ? row.status === 'skipped'
                    ? `Not cooking${row.skip_reason ? ` — ${row.skip_reason}` : ''}`
                    : row.is_leftover
                    ? `Leftovers: ${baseTitle}`
                    : baseTitle
                  : null

                return (
                  <div key={slotType} style={slotRowStyle}>
                    <span style={slotLabelStyle}>{SLOT_LABELS[slotType]}</span>

                    {isEditing ? (
                      <div style={{ display: 'flex', gap: '0.5rem', flex: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                        <select
                          value={selectedValue}
                          onChange={(e) => setSelectedValue(e.target.value)}
                          style={selectStyle}
                        >
                          <option value="">-- Nothing planned --</option>
                          <option value="skip">Not cooking (eating out / provided)</option>
                          {recipeOptions.length > 0 && (
                            <optgroup label="Recipes">
                              {recipeOptions.map((r) => (
                                <option key={`recipe:${r.id}`} value={`recipe:${r.id}`}>
                                  {r.title}
                                </option>
                              ))}
                            </optgroup>
                          )}
                          {mealOptions.length > 0 && (
                            <optgroup label="Meals">
                              {mealOptions.map((m) => (
                                <option key={`meal:${m.id}`} value={`meal:${m.id}`}>
                                  {m.name}
                                </option>
                              ))}
                            </optgroup>
                          )}
                        </select>
                        {selectedValue === 'skip' && (
                          <input
                            type="text"
                            value={skipReason}
                            onChange={(e) => setSkipReason(e.target.value)}
                            placeholder="Why (optional): eating out, work lunch..."
                            style={{ ...selectStyle, flex: 1, minWidth: '180px' }}
                          />
                        )}
                        {(selectedValue.startsWith('recipe:') || selectedValue.startsWith('meal:')) && (
                          <>
                            <input
                              type="number"
                              value={servingsMade}
                              onChange={(e) => setServingsMade(e.target.value)}
                              placeholder="Servings made"
                              style={{ ...selectStyle, width: '130px' }}
                            />
                            <input
                              type="number"
                              value={servingsPerSitting}
                              onChange={(e) => setServingsPerSitting(e.target.value)}
                              placeholder="Per sitting"
                              style={{ ...selectStyle, width: '110px' }}
                            />
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => handleSaveSlot(dateStr, slotType)}
                          disabled={savingSlot}
                          style={smallButtonStyle}
                        >
                          Save
                        </button>
                        <button type="button" onClick={handleCancelEdit} style={smallCancelStyle}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flex: 1 }}>
                        {label ? (
                          <>
                            <span>{label}</span>
                            {!row.is_leftover && row.servings_remaining > 0 && (
                              <span style={{ fontSize: '0.8rem', color: '#888' }}>
                                ({row.servings_remaining} more serving{row.servings_remaining === 1 ? '' : 's'} left)
                              </span>
                            )}
                            <button type="button" onClick={() => handleOpenEditor(key, row)} style={linkButtonStyle}>
                              change
                            </button>
                            <button type="button" onClick={() => handleClearSlot(row)} style={linkButtonStyle}>
                              clear
                            </button>
                          </>
                        ) : (
                          <button type="button" onClick={() => handleOpenEditor(key, null)} style={linkButtonStyle}>
                            + Add
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const dayCardStyle = {
  border: '1px solid #ddd',
  borderRadius: '6px',
  padding: '0.75rem 1rem',
  backgroundColor: 'white',
}

const slotRowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  padding: '0.35rem 0',
  borderTop: '1px solid #f0f0f0',
}

const slotLabelStyle = {
  width: '80px',
  flexShrink: 0,
  color: '#555',
  fontSize: '0.9rem',
}

const selectStyle = {
  padding: '0.4rem',
  fontSize: '0.95rem',
  border: '1px solid #ccc',
  borderRadius: '4px',
  fontFamily: 'inherit',
}

const navButtonStyle = {
  padding: '0.4rem 0.75rem',
  fontSize: '0.9rem',
  backgroundColor: 'white',
  color: '#2f7a4d',
  border: '1px solid #2f7a4d',
  borderRadius: '4px',
  cursor: 'pointer',
}

const smallButtonStyle = {
  padding: '0.35rem 0.75rem',
  fontSize: '0.85rem',
  backgroundColor: '#2f7a4d',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
}

const smallCancelStyle = {
  padding: '0.35rem 0.75rem',
  fontSize: '0.85rem',
  backgroundColor: 'white',
  color: '#555',
  border: '1px solid #ccc',
  borderRadius: '4px',
  cursor: 'pointer',
}

const linkButtonStyle = {
  background: 'none',
  border: 'none',
  color: '#2f7a4d',
  cursor: 'pointer',
  fontSize: '0.9rem',
  padding: 0,
}

export default WeekPlanner
