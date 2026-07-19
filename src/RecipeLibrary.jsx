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
  const [allTags, setAllTags] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [searchText, setSearchText] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [favoritesOnly, setFavoritesOnly] = useState(false)

  useEffect(() => {
    loadRecipes()
    loadTags()
  }, [refreshKey])

  async function loadRecipes() {
    setLoading(true)
    const { data, error } = await supabase
      .from('recipes')
      .select('*, recipe_ingredients(ingredients(name)), recipe_tags(tags(name))')
      .order('created_at', { ascending: false })

    if (error) {
      setErrorMessage(`Couldn't load recipes: ${error.message}`)
    } else {
      setRecipes(data || [])
    }
    setLoading(false)
  }

  async function loadTags() {
    const { data } = await supabase.from('tags').select('name').order('name')
    setAllTags((data || []).map((t) => t.name))
  }

  const filteredRecipes = recipes.filter((recipe) => {
    if (favoritesOnly && !recipe.is_favorite) return false

    if (tagFilter) {
      const tagNames = (recipe.recipe_tags || []).map((rt) => rt.tags?.name)
      if (!tagNames.includes(tagFilter)) return false
    }

    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase()
      const titleMatch = recipe.title.toLowerCase().includes(q)
      const ingredientMatch = (recipe.recipe_ingredients || []).some((ri) =>
        (ri.ingredients?.name || '').toLowerCase().includes(q)
      )
      if (!titleMatch && !ingredientMatch) return false
    }

    return true
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0 }}>My Recipes</h2>
        <button onClick={onAddClick} style={buttonStyle}>
          + Add recipe
        </button>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Search title or ingredient..."
          style={{ ...inputStyle, flex: 2, minWidth: '180px' }}
        />
        <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
          <option value="">All tags</option>
          {allTags.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.9rem' }}>
          <input type="checkbox" checked={favoritesOnly} onChange={(e) => setFavoritesOnly(e.target.checked)} />
          Favorites only
        </label>
      </div>

      {loading && <p>Loading...</p>}
      {errorMessage && <p style={{ color: '#b3261e' }}>{errorMessage}</p>}

      {!loading && recipes.length === 0 && !errorMessage && (
        <p style={{ color: '#555' }}>No recipes yet. Add your first one to get started.</p>
      )}

      {!loading && recipes.length > 0 && filteredRecipes.length === 0 && (
        <p style={{ color: '#555' }}>No recipes match your search/filters.</p>
      )}

      <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {filteredRecipes.map((recipe) => (
          <li key={recipe.id} onClick={() => onSelectRecipe(recipe.id)} style={{ ...cardStyle, display: 'flex', gap: '0.75rem' }}>
            {recipe.photo_path && (
              <img
                src={recipe.photo_path}
                alt=""
                style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }}
              />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>
                  {recipe.is_favorite && <span style={{ color: '#b8860b' }}>★ </span>}
                  {recipe.title}
                </strong>
                {recipe.rating ? <span>{'★'.repeat(recipe.rating)}</span> : null}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', fontSize: '0.85rem', color: '#555', flexWrap: 'wrap' }}>
                <span style={badgeStyle}>{SOURCE_LABELS[recipe.source_type] || recipe.source_type}</span>
                <span style={badgeStyle}>
                  {recipe.capture_status === 'structured' ? 'Structured' : 'Quick capture'}
                </span>
                {recipe.times_cooked > 0 && <span style={badgeStyle}>Cooked {recipe.times_cooked}x</span>}
                {(recipe.recipe_tags || []).map((rt) =>
                  rt.tags?.name ? (
                    <span key={rt.tags.name} style={tagBadgeStyle}>
                      {rt.tags.name}
                    </span>
                  ) : null
                )}
              </div>
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

const tagBadgeStyle = {
  backgroundColor: '#eaf3ee',
  color: '#2f7a4d',
  borderRadius: '999px',
  padding: '0.1rem 0.5rem',
}

const inputStyle = {
  padding: '0.4rem',
  fontSize: '0.9rem',
  border: '1px solid #ccc',
  borderRadius: '4px',
  fontFamily: 'inherit',
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
