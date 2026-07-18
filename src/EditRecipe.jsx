import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import ComponentSelect from './ComponentSelect'
import TagPicker from './TagPicker'

const emptyIngredientRow = { name: '', quantity: '', unit: '' }

function EditRecipe({ recipeId, onSaved, onCancel }) {
  const [title, setTitle] = useState('')
  const [sourceType, setSourceType] = useState('original')
  const [sourceUrl, setSourceUrl] = useState('')
  const [instructions, setInstructions] = useState('')
  const [servingsDefault, setServingsDefault] = useState('')
  const [notes, setNotes] = useState('')
  const [ingredientRows, setIngredientRows] = useState([{ ...emptyIngredientRow }])
  const [isComponentOption, setIsComponentOption] = useState(false)
  const [componentId, setComponentId] = useState('')
  const [tagNames, setTagNames] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    async function loadRecipe() {
      setLoading(true)
      const [
        { data: recipeData, error: recipeError },
        { data: ingredientData, error: ingredientError },
        { data: tagData, error: tagError },
      ] = await Promise.all([
        supabase.from('recipes').select('*').eq('id', recipeId).single(),
        supabase
          .from('recipe_ingredients')
          .select('id, quantity, unit, ingredients(name)')
          .eq('recipe_id', recipeId),
        supabase.from('recipe_tags').select('tags(name)').eq('recipe_id', recipeId),
      ])

      if (recipeError) {
        setErrorMessage(`Couldn't load recipe: ${recipeError.message}`)
        setLoading(false)
        return
      }

      setTitle(recipeData.title || '')
      setSourceType(recipeData.source_type || 'original')
      setSourceUrl(recipeData.source_url || '')
      setInstructions(recipeData.instructions || '')
      setServingsDefault(recipeData.servings_default ?? '')
      setNotes(recipeData.notes || '')
      setIsComponentOption(recipeData.is_component_option || false)
      setComponentId(recipeData.component_id || '')

      if (!ingredientError && ingredientData && ingredientData.length > 0) {
        setIngredientRows(
          ingredientData.map((item) => ({
            name: item.ingredients?.name || '',
            quantity: item.quantity ?? '',
            unit: item.unit || '',
          }))
        )
      }

      if (!tagError && tagData) {
        setTagNames(tagData.map((t) => t.tags?.name).filter(Boolean))
      }

      setLoading(false)
    }
    loadRecipe()
  }, [recipeId])

  function updateIngredientRow(index, field, value) {
    setIngredientRows((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  function addIngredientRow() {
    setIngredientRows((prev) => [...prev, { ...emptyIngredientRow }])
  }

  function removeIngredientRow(index) {
    setIngredientRows((prev) => prev.filter((_, i) => i !== index))
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

  async function findOrCreateTagId(name) {
    const trimmed = name.trim()
    const { data: existing, error: findError } = await supabase
      .from('tags')
      .select('id')
      .ilike('name', trimmed)
      .maybeSingle()

    if (findError) throw findError
    if (existing) return existing.id

    const { data: created, error: createError } = await supabase
      .from('tags')
      .insert({ name: trimmed })
      .select('id')
      .single()

    if (createError) throw createError
    return created.id
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) {
      setErrorMessage('Please enter a title.')
      return
    }

    setSaving(true)
    setErrorMessage('')

    const filledRows = ingredientRows.filter((row) => row.name.trim())
    const captureStatus = filledRows.length > 0 ? 'structured' : 'quick_capture'

    try {
      const { error: updateError } = await supabase
        .from('recipes')
        .update({
          title: title.trim(),
          source_type: sourceType,
          source_url: sourceUrl.trim() || null,
          instructions: instructions.trim() || null,
          servings_default: servingsDefault ? Number(servingsDefault) : null,
          capture_status: captureStatus,
          notes: notes.trim() || null,
          is_component_option: isComponentOption,
          component_id: isComponentOption && componentId ? componentId : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', recipeId)

      if (updateError) throw updateError

      // Simplest reliable way to keep ingredients in sync: replace them wholesale.
      const { error: deleteError } = await supabase
        .from('recipe_ingredients')
        .delete()
        .eq('recipe_id', recipeId)
      if (deleteError) throw deleteError

      for (const row of filledRows) {
        const ingredientId = await findOrCreateIngredientId(row.name)
        const { error: linkError } = await supabase.from('recipe_ingredients').insert({
          recipe_id: recipeId,
          ingredient_id: ingredientId,
          quantity: row.quantity ? Number(row.quantity) : null,
          unit: row.unit.trim() || null,
        })
        if (linkError) throw linkError
      }

      // Same wholesale-replace approach for tags.
      const { error: deleteTagsError } = await supabase
        .from('recipe_tags')
        .delete()
        .eq('recipe_id', recipeId)
      if (deleteTagsError) throw deleteTagsError

      for (const tagName of tagNames) {
        const tagId = await findOrCreateTagId(tagName)
        const { error: tagLinkError } = await supabase
          .from('recipe_tags')
          .insert({ recipe_id: recipeId, tag_id: tagId })
        if (tagLinkError) throw tagLinkError
      }

      onSaved()
    } catch (err) {
      setErrorMessage(`Couldn't save changes: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p>Loading...</p>

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <button type="button" onClick={onCancel} style={backButtonStyle}>
        ← Cancel
      </button>

      <h2 style={{ margin: 0 }}>Edit recipe</h2>

      <section>
        <label style={labelStyle}>
          Title
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} required />
        </label>

        <label style={labelStyle}>
          Where's this from?
          <select value={sourceType} onChange={(e) => setSourceType(e.target.value)} style={inputStyle}>
            <option value="original">My own creation</option>
            <option value="tiktok">TikTok</option>
            <option value="website">Website</option>
            <option value="cookbook_photo">Cookbook photo</option>
          </select>
        </label>

        <label style={labelStyle}>
          Link (optional)
          <input type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} style={inputStyle} />
        </label>

        <label style={labelStyle}>
          Servings (optional)
          <input
            type="number"
            value={servingsDefault}
            onChange={(e) => setServingsDefault(e.target.value)}
            style={inputStyle}
          />
        </label>
      </section>

      <section>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <input
            type="checkbox"
            checked={isComponentOption}
            onChange={(e) => setIsComponentOption(e.target.checked)}
          />
          This is a reusable component (a protein, vegetable, grain, sauce, etc.)
        </label>
        {isComponentOption && (
          <label style={labelStyle}>
            Component category
            <ComponentSelect value={componentId} onChange={setComponentId} />
          </label>
        )}
      </section>

      <section>
        <h3 style={{ marginBottom: '0.5rem' }}>Tags (optional)</h3>
        <TagPicker value={tagNames} onChange={setTagNames} />
      </section>

      <section>
        <h3 style={{ marginBottom: '0.5rem' }}>Ingredients (optional)</h3>
        {ingredientRows.map((row, index) => (
          <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <input
              type="text"
              placeholder="Ingredient"
              value={row.name}
              onChange={(e) => updateIngredientRow(index, 'name', e.target.value)}
              style={{ ...inputStyle, flex: 2 }}
            />
            <input
              type="text"
              placeholder="Qty"
              value={row.quantity}
              onChange={(e) => updateIngredientRow(index, 'quantity', e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
            />
            <input
              type="text"
              placeholder="Unit"
              value={row.unit}
              onChange={(e) => updateIngredientRow(index, 'unit', e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
            />
            <button
              type="button"
              onClick={() => removeIngredientRow(index)}
              style={removeButtonStyle}
              aria-label="Remove ingredient"
            >
              ✕
            </button>
          </div>
        ))}
        <button type="button" onClick={addIngredientRow} style={secondaryButtonStyle}>
          + Add ingredient
        </button>
      </section>

      <section>
        <label style={labelStyle}>
          Instructions (optional)
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={5}
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          Notes / quick capture text
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} style={inputStyle} />
        </label>
      </section>

      <button type="submit" disabled={saving} style={buttonStyle}>
        {saving ? 'Saving...' : 'Save changes'}
      </button>

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

const secondaryButtonStyle = {
  padding: '0.4rem 0.75rem',
  fontSize: '0.9rem',
  backgroundColor: 'white',
  color: '#2f7a4d',
  border: '1px solid #2f7a4d',
  borderRadius: '4px',
  cursor: 'pointer',
}

const removeButtonStyle = {
  padding: '0.4rem 0.6rem',
  fontSize: '0.9rem',
  backgroundColor: 'white',
  color: '#b3261e',
  border: '1px solid #ddd',
  borderRadius: '4px',
  cursor: 'pointer',
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

export default EditRecipe
