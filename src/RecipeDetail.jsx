import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

const SOURCE_LABELS = {
  tiktok: 'TikTok',
  website: 'Website',
  cookbook_photo: 'Cookbook photo',
  original: 'Original',
}

function RecipeDetail({ recipeId, onBack, onEdit, refreshKey }) {
  const [recipe, setRecipe] = useState(null)
  const [ingredients, setIngredients] = useState([])
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    async function loadRecipe() {
      setLoading(true)
      const [
        { data: recipeData, error: recipeError },
        { data: ingredientData, error: ingredientError },
        { data: tagData, error: tagError },
      ] = await Promise.all([
        supabase.from('recipes').select('*, components(name)').eq('id', recipeId).single(),
        supabase
          .from('recipe_ingredients')
          .select('id, quantity, unit, raw_text, ingredients(name)')
          .eq('recipe_id', recipeId),
        supabase.from('recipe_tags').select('tags(name)').eq('recipe_id', recipeId),
      ])

      if (recipeError) {
        setErrorMessage(`Couldn't load recipe: ${recipeError.message}`)
      } else {
        setRecipe(recipeData)
      }
      if (!ingredientError) {
        setIngredients(ingredientData || [])
      }
      if (!tagError && tagData) {
        setTags(tagData.map((t) => t.tags?.name).filter(Boolean))
      }
      setLoading(false)
    }
    loadRecipe()
  }, [recipeId, refreshKey])

  async function toggleFavorite() {
    const newValue = !recipe.is_favorite
    setRecipe((prev) => ({ ...prev, is_favorite: newValue }))
    await supabase.from('recipes').update({ is_favorite: newValue }).eq('id', recipeId)
  }

  async function setRating(newRating) {
    // Clicking the currently-set star again clears the rating.
    const nextRating = recipe.rating === newRating ? null : newRating
    setRecipe((prev) => ({ ...prev, rating: nextRating }))
    await supabase.from('recipes').update({ rating: nextRating }).eq('id', recipeId)
  }

  async function markCookedAgain() {
    const newCount = (recipe.times_cooked || 0) + 1
    setRecipe((prev) => ({ ...prev, times_cooked: newCount }))
    await supabase.from('recipes').update({ times_cooked: newCount }).eq('id', recipeId)
  }

  if (loading) return <p>Loading...</p>
  if (errorMessage) return <p style={{ color: '#b3261e' }}>{errorMessage}</p>
  if (!recipe) return null

  return (
    <div>
      <button onClick={onBack} style={backButtonStyle}>
        ← Back to My Recipes
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h2 style={{ marginTop: 0 }}>{recipe.title}</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={toggleFavorite} style={favoriteButtonStyle} aria-label="Toggle favorite">
            {recipe.is_favorite ? '★ Favorite' : '☆ Favorite'}
          </button>
          <button onClick={onEdit} style={smallButtonStyle}>
            Edit
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.15rem', marginBottom: '0.5rem' }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => setRating(n)}
            style={starButtonStyle}
            aria-label={`Rate ${n} star${n === 1 ? '' : 's'}`}
          >
            {recipe.rating && n <= recipe.rating ? '★' : '☆'}
          </button>
        ))}
        <span style={{ fontSize: '0.85rem', color: '#555', marginLeft: '0.5rem' }}>
          Cooked {recipe.times_cooked || 0}x
        </span>
        <button onClick={markCookedAgain} style={{ ...linkButtonStyle, marginLeft: '0.5rem' }}>
          + Mark cooked again
        </button>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#555', flexWrap: 'wrap' }}>
        <span style={badgeStyle}>{SOURCE_LABELS[recipe.source_type] || recipe.source_type}</span>
        <span style={badgeStyle}>{recipe.capture_status === 'structured' ? 'Structured' : 'Quick capture'}</span>
        {recipe.servings_default && <span style={badgeStyle}>Serves {recipe.servings_default}</span>}
        {recipe.is_component_option && recipe.components?.name && (
          <span style={badgeStyle}>Component: {recipe.components.name}</span>
        )}
      </div>

      {tags.length > 0 && (
        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          {tags.map((name) => (
            <span key={name} style={tagBadgeStyle}>
              {name}
            </span>
          ))}
        </div>
      )}

      {recipe.source_url && (
        <p>
          Source:{' '}
          <a href={recipe.source_url} target="_blank" rel="noreferrer">
            {recipe.source_url}
          </a>
        </p>
      )}

      {ingredients.length > 0 && (
        <section style={{ marginBottom: '1rem' }}>
          <h3>Ingredients</h3>
          <ul>
            {ingredients.map((item) => (
              <li key={item.id}>
                {item.quantity ? `${item.quantity} ` : ''}
                {item.unit ? `${item.unit} ` : ''}
                {item.ingredients?.name || item.raw_text || '(unnamed ingredient)'}
              </li>
            ))}
          </ul>
        </section>
      )}

      {recipe.instructions && (
        <section style={{ marginBottom: '1rem' }}>
          <h3>Instructions</h3>
          <p style={{ whiteSpace: 'pre-wrap' }}>{recipe.instructions}</p>
        </section>
      )}

      {recipe.notes && (
        <section style={{ marginBottom: '1rem' }}>
          <h3>Notes</h3>
          <p style={{ whiteSpace: 'pre-wrap' }}>{recipe.notes}</p>
        </section>
      )}
    </div>
  )
}

const badgeStyle = {
  backgroundColor: '#f0f0f0',
  borderRadius: '4px',
  padding: '0.1rem 0.5rem',
}

const backButtonStyle = {
  background: 'none',
  border: 'none',
  color: '#2f7a4d',
  cursor: 'pointer',
  padding: 0,
  marginBottom: '1rem',
  fontSize: '0.95rem',
}

const smallButtonStyle = {
  padding: '0.4rem 0.75rem',
  fontSize: '0.9rem',
  backgroundColor: '#2f7a4d',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
}

const favoriteButtonStyle = {
  padding: '0.4rem 0.75rem',
  fontSize: '0.9rem',
  backgroundColor: 'white',
  color: '#b8860b',
  border: '1px solid #ccc',
  borderRadius: '4px',
  cursor: 'pointer',
}

const starButtonStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: '1.2rem',
  color: '#b8860b',
  padding: 0,
  lineHeight: 1,
}

const linkButtonStyle = {
  background: 'none',
  border: 'none',
  color: '#2f7a4d',
  cursor: 'pointer',
  fontSize: '0.85rem',
  padding: 0,
}

const tagBadgeStyle = {
  backgroundColor: '#eaf3ee',
  color: '#2f7a4d',
  borderRadius: '999px',
  padding: '0.15rem 0.6rem',
  fontSize: '0.8rem',
}

export default RecipeDetail
