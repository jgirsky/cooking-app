import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import ComponentSelect from './ComponentSelect'

function AddMeal({ onSaved, onCancel }) {
  const [name, setName] = useState('')
  const [slots, setSlots] = useState([]) // { componentId, componentName, recipeId, recipeTitle }
  const [currentComponentId, setCurrentComponentId] = useState('')
  const [currentComponentName, setCurrentComponentName] = useState('')
  const [recipeOptions, setRecipeOptions] = useState([])
  const [currentRecipeId, setCurrentRecipeId] = useState('')
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!currentComponentId) {
      setRecipeOptions([])
      setCurrentComponentName('')
      return
    }
    async function loadOptions() {
      setLoadingOptions(true)
      const [{ data: componentData }, { data: recipeData }] = await Promise.all([
        supabase.from('components').select('name').eq('id', currentComponentId).single(),
        supabase
          .from('recipes')
          .select('id, title')
          .eq('component_id', currentComponentId)
          .eq('is_component_option', true)
          .order('title'),
      ])
      setCurrentComponentName(componentData?.name || '')
      setRecipeOptions(recipeData || [])
      setCurrentRecipeId('')
      setLoadingOptions(false)
    }
    loadOptions()
  }, [currentComponentId])

  function handleAddSlot() {
    if (!currentComponentId || !currentRecipeId) return
    const recipe = recipeOptions.find((r) => r.id === currentRecipeId)
    setSlots((prev) => [
      ...prev,
      {
        componentId: currentComponentId,
        componentName: currentComponentName,
        recipeId: currentRecipeId,
        recipeTitle: recipe?.title || '',
      },
    ])
    setCurrentComponentId('')
    setCurrentRecipeId('')
  }

  function handleRemoveSlot(index) {
    setSlots((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) {
      setErrorMessage('Please enter a meal name.')
      return
    }
    if (slots.length === 0) {
      setErrorMessage('Add at least one component slot.')
      return
    }

    setSaving(true)
    setErrorMessage('')

    try {
      const { data: newMeal, error: mealError } = await supabase
        .from('meals')
        .insert({ name: name.trim(), meal_type: 'composed' })
        .select('id')
        .single()

      if (mealError) throw mealError

      const slotRows = slots.map((slot) => ({
        meal_id: newMeal.id,
        component_id: slot.componentId,
        recipe_id: slot.recipeId,
      }))
      const { error: slotsError } = await supabase.from('meal_component_slots').insert(slotRows)
      if (slotsError) throw slotsError

      onSaved()
    } catch (err) {
      setErrorMessage(`Couldn't save meal: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <button type="button" onClick={onCancel} style={backButtonStyle}>
        ← Back to Meals
      </button>

      <h2 style={{ margin: 0 }}>Build a meal</h2>

      <label style={labelStyle}>
        Meal name
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Chicken Bowl"
          style={inputStyle}
        />
      </label>

      <section>
        <h3 style={{ marginBottom: '0.5rem' }}>Components in this meal</h3>

        {slots.length > 0 && (
          <ul style={{ paddingLeft: '1.25rem', marginBottom: '1rem' }}>
            {slots.map((slot, index) => (
              <li key={index} style={{ marginBottom: '0.25rem' }}>
                <strong>{slot.componentName}:</strong> {slot.recipeTitle}{' '}
                <button type="button" onClick={() => handleRemoveSlot(index)} style={removeLinkStyle}>
                  remove
                </button>
              </li>
            ))}
          </ul>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', border: '1px dashed #ccc', padding: '0.75rem', borderRadius: '6px' }}>
          <label style={labelStyle}>
            Component category
            <ComponentSelect value={currentComponentId} onChange={setCurrentComponentId} />
          </label>

          {currentComponentId && (
            <label style={labelStyle}>
              Recipe for this slot
              {loadingOptions ? (
                <span style={{ fontSize: '0.9rem', color: '#555' }}>Loading options...</span>
              ) : recipeOptions.length === 0 ? (
                <span style={{ fontSize: '0.9rem', color: '#555' }}>
                  No recipes tagged for this category yet. Go tag one from the recipe's page first.
                </span>
              ) : (
                <select value={currentRecipeId} onChange={(e) => setCurrentRecipeId(e.target.value)} style={inputStyle}>
                  <option value="">-- Select a recipe --</option>
                  {recipeOptions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title}
                    </option>
                  ))}
                </select>
              )}
            </label>
          )}

          <button
            type="button"
            onClick={handleAddSlot}
            disabled={!currentComponentId || !currentRecipeId}
            style={secondaryButtonStyle}
          >
            + Add this slot
          </button>
        </div>
      </section>

      <button type="submit" disabled={saving} style={buttonStyle}>
        {saving ? 'Saving...' : 'Save meal'}
      </button>

      {errorMessage && <p style={{ color: '#b3261e' }}>{errorMessage}</p>}
    </form>
  )
}

const labelStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
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

const secondaryButtonStyle = {
  padding: '0.4rem 0.75rem',
  fontSize: '0.9rem',
  backgroundColor: 'white',
  color: '#2f7a4d',
  border: '1px solid #2f7a4d',
  borderRadius: '4px',
  cursor: 'pointer',
  alignSelf: 'flex-start',
}

const removeLinkStyle = {
  background: 'none',
  border: 'none',
  color: '#b3261e',
  cursor: 'pointer',
  fontSize: '0.85rem',
  padding: 0,
}

const backButtonStyle = {
  background: 'none',
  border: 'none',
  color: '#2f7a4d',
  cursor: 'pointer',
  padding: 0,
  fontSize: '0.95rem',
  textAlign: 'left',
}

export default AddMeal
