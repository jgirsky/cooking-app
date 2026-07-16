import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

const SOURCE_LABELS = {
  tiktok: 'TikTok',
  website: 'Website',
  cookbook_photo: 'Cookbook photo',
  original: 'Original',
}

function RecipeDetail({ recipeId, onBack }) {
  const [recipe, setRecipe] = useState(null)
  const [ingredients, setIngredients] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    async function loadRecipe() {
      setLoading(true)
      const [{ data: recipeData, error: recipeError }, { data: ingredientData, error: ingredientError }] =
        await Promise.all([
          supabase.from('recipes').select('*').eq('id', recipeId).single(),
          supabase
            .from('recipe_ingredients')
            .select('id, quantity, unit, raw_text, ingredients(name)')
            .eq('recipe_id', recipeId),
        ])

      if (recipeError) {
        setErrorMessage(`Couldn't load recipe: ${recipeError.message}`)
      } else {
        setRecipe(recipeData)
      }
      if (!ingredientError) {
        setIngredients(ingredientData || [])
      }
      setLoading(false)
    }
    loadRecipe()
  }, [recipeId])

  if (loading) return <p>Loading...</p>
  if (errorMessage) return <p style={{ color: '#b3261e' }}>{errorMessage}</p>
  if (!recipe) return null

  return (
    <div>
      <button onClick={onBack} style={backButtonStyle}>
        ← Back to My Recipes
      </button>

      <h2>{recipe.title}</h2>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.85rem', color: '#555' }}>
        <span style={badgeStyle}>{SOURCE_LABELS[recipe.source_type] || recipe.source_type}</span>
        <span style={badgeStyle}>{recipe.capture_status === 'structured' ? 'Structured' : 'Quick capture'}</span>
        {recipe.servings_default && <span style={badgeStyle}>Serves {recipe.servings_default}</span>}
      </div>

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

export default RecipeDetail
