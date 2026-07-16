import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

const SOURCE_LABELS = {
  tiktok: 'TikTok',
  website: 'Website',
  cookbook_photo: 'Cookbook photo',
  original: 'Original',
}

function RecipeLibrary({ onAddClick, onSelectRecipe, refreshKey }) {
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    async function loadRecipes() {
      setLoading(true)
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        setErrorMessage(`Couldn't load recipes: ${error.message}`)
      } else {
        setRecipes(data || [])
      }
      setLoading(false)
    }
    loadRecipes()
  }, [refreshKey])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0 }}>My Recipes</h2>
        <button onClick={onAddClick} style={buttonStyle}>
          + Add recipe
        </button>
      </div>

      {loading && <p>Loading...</p>}
      {errorMessage && <p style={{ color: '#b3261e' }}>{errorMessage}</p>}

      {!loading && recipes.length === 0 && !errorMessage && (
        <p style={{ color: '#555' }}>No recipes yet. Add your first one to get started.</p>
      )}

      <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {recipes.map((recipe) => (
          <li
            key={recipe.id}
            onClick={() => onSelectRecipe(recipe.id)}
            style={cardStyle}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>{recipe.title}</strong>
              {recipe.rating ? <span>{'★'.repeat(recipe.rating)}</span> : null}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', fontSize: '0.85rem', color: '#555' }}>
              <span style={badgeStyle}>{SOURCE_LABELS[recipe.source_type] || recipe.source_type}</span>
              <span style={badgeStyle}>
                {recipe.capture_status === 'structured' ? 'Structured' : 'Quick capture'}
              </span>
              {recipe.times_cooked > 0 && <span style={badgeStyle}>Cooked {recipe.times_cooked}x</span>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

const cardStyle = {
  border: '1px solid #ddd',
  borderRadius: '6px',
  padding: '0.75rem 1rem',
  cursor: 'pointer',
  backgroundColor: 'white',
}

const badgeStyle = {
  backgroundColor: '#f0f0f0',
  borderRadius: '4px',
  padding: '0.1rem 0.5rem',
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

export default RecipeLibrary
