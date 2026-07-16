import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

const DIET_OPTIONS = [
  'Vegetarian',
  'Vegan',
  'Gluten-free',
  'Dairy-free',
  'Nut-free',
  'Keto',
  'Pescatarian',
]

// Helpers to convert between comma-separated text (what's easy to type in a
// text box) and the text[] arrays Postgres stores.
function toList(str) {
  return str
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}
function toText(list) {
  return (list || []).join(', ')
}

const emptyForm = {
  likedIngredients: '',
  dislikedIngredients: '',
  allergies: '',
  dietRestrictions: [],
  goalsText: '',
  calorieTarget: '',
  proteinTarget: '',
  carbTarget: '',
  fatTarget: '',
}

function Onboarding() {
  const [recordId, setRecordId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedMessage, setSavedMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    async function loadExisting() {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .limit(1)
        .maybeSingle()

      if (error) {
        setErrorMessage(`Couldn't load your saved preferences: ${error.message}`)
      } else if (data) {
        setRecordId(data.id)
        setForm({
          likedIngredients: toText(data.liked_ingredients),
          dislikedIngredients: toText(data.disliked_ingredients),
          allergies: toText(data.allergies),
          dietRestrictions: data.diet_restrictions || [],
          goalsText: data.goals_text || '',
          calorieTarget: data.calorie_target ?? '',
          proteinTarget: data.protein_target ?? '',
          carbTarget: data.carb_target ?? '',
          fatTarget: data.fat_target ?? '',
        })
      }
      setLoading(false)
    }
    loadExisting()
  }, [])

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function toggleDiet(option) {
    setForm((prev) => {
      const has = prev.dietRestrictions.includes(option)
      return {
        ...prev,
        dietRestrictions: has
          ? prev.dietRestrictions.filter((d) => d !== option)
          : [...prev.dietRestrictions, option],
      }
    })
  }

  function toNumberOrNull(value) {
    if (value === '' || value === null || value === undefined) return null
    const n = Number(value)
    return Number.isNaN(n) ? null : n
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setSavedMessage('')
    setErrorMessage('')

    const payload = {
      liked_ingredients: toList(form.likedIngredients),
      disliked_ingredients: toList(form.dislikedIngredients),
      allergies: toList(form.allergies),
      diet_restrictions: form.dietRestrictions,
      goals_text: form.goalsText,
      calorie_target: toNumberOrNull(form.calorieTarget),
      protein_target: toNumberOrNull(form.proteinTarget),
      carb_target: toNumberOrNull(form.carbTarget),
      fat_target: toNumberOrNull(form.fatTarget),
      updated_at: new Date().toISOString(),
    }

    let error
    if (recordId) {
      ;({ error } = await supabase.from('user_preferences').update(payload).eq('id', recordId))
    } else {
      const { data, error: insertError } = await supabase
        .from('user_preferences')
        .insert(payload)
        .select()
        .single()
      error = insertError
      if (data) setRecordId(data.id)
    }

    if (error) {
      setErrorMessage(`Couldn't save: ${error.message}`)
    } else {
      setSavedMessage('Preferences saved.')
    }
    setSaving(false)
  }

  if (loading) {
    return <p>Loading your preferences...</p>
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <section>
        <h2 style={{ marginBottom: '0.5rem' }}>Food likes & dislikes</h2>
        <label style={labelStyle}>
          Foods/ingredients you like (comma-separated)
          <input
            type="text"
            value={form.likedIngredients}
            onChange={(e) => updateField('likedIngredients', e.target.value)}
            placeholder="chicken thighs, broccoli, garlic"
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          Foods/ingredients you dislike (comma-separated)
          <input
            type="text"
            value={form.dislikedIngredients}
            onChange={(e) => updateField('dislikedIngredients', e.target.value)}
            placeholder="cilantro, olives"
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          Allergies (comma-separated)
          <input
            type="text"
            value={form.allergies}
            onChange={(e) => updateField('allergies', e.target.value)}
            placeholder="peanuts, shellfish"
            style={inputStyle}
          />
        </label>
      </section>

      <section>
        <h2 style={{ marginBottom: '0.5rem' }}>Dietary restrictions</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
          {DIET_OPTIONS.map((option) => (
            <label key={option} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <input
                type="checkbox"
                checked={form.dietRestrictions.includes(option)}
                onChange={() => toggleDiet(option)}
              />
              {option}
            </label>
          ))}
        </div>
      </section>

      <section>
        <h2 style={{ marginBottom: '0.5rem' }}>Goals</h2>
        <label style={labelStyle}>
          General goals (freeform)
          <textarea
            value={form.goalsText}
            onChange={(e) => updateField('goalsText', e.target.value)}
            placeholder="e.g. eat more protein, cook more vegetables, lose a few pounds"
            rows={3}
            style={inputStyle}
          />
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <label style={labelStyle}>
            Calorie target (optional)
            <input
              type="number"
              value={form.calorieTarget}
              onChange={(e) => updateField('calorieTarget', e.target.value)}
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            Protein target, g (optional)
            <input
              type="number"
              value={form.proteinTarget}
              onChange={(e) => updateField('proteinTarget', e.target.value)}
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            Carb target, g (optional)
            <input
              type="number"
              value={form.carbTarget}
              onChange={(e) => updateField('carbTarget', e.target.value)}
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            Fat target, g (optional)
            <input
              type="number"
              value={form.fatTarget}
              onChange={(e) => updateField('fatTarget', e.target.value)}
              style={inputStyle}
            />
          </label>
        </div>
      </section>

      <button type="submit" disabled={saving} style={buttonStyle}>
        {saving ? 'Saving...' : 'Save preferences'}
      </button>

      {savedMessage && <p style={{ color: '#2f7a4d' }}>{savedMessage}</p>}
      {errorMessage && <p style={{ color: '#b3261e' }}>{errorMessage}</p>}
    </form>
  )
}

const labelStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
  marginBottom: '0.75rem',
  fontSize: '0.95rem',
}

const inputStyle = {
  padding: '0.5rem',
  fontSize: '1rem',
  border: '1px solid #ccc',
  borderRadius: '4px',
  fontFamily: 'inherit',
}

const buttonStyle = {
  padding: '0.75rem',
  fontSize: '1rem',
  backgroundColor: '#2f7a4d',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
}

export default Onboarding
