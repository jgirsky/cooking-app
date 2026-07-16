import { useState } from 'react'
import Onboarding from './Onboarding'
import RecipeLibrary from './RecipeLibrary'
import RecipeDetail from './RecipeDetail'
import AddRecipe from './AddRecipe'

function App() {
  const [view, setView] = useState('recipes') // 'recipes' | 'add-recipe' | 'recipe-detail' | 'preferences'
  const [selectedRecipeId, setSelectedRecipeId] = useState(null)
  const [libraryRefreshKey, setLibraryRefreshKey] = useState(0)

  function goToRecipes() {
    setView('recipes')
  }

  function handleSelectRecipe(id) {
    setSelectedRecipeId(id)
    setView('recipe-detail')
  }

  function handleRecipeSaved() {
    setLibraryRefreshKey((key) => key + 1)
    goToRecipes()
  }

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '2rem', maxWidth: 640, margin: '0 auto' }}>
      <h1 style={{ marginBottom: '0.25rem' }}>Cooking App</h1>

      <nav style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid #ddd', paddingBottom: '0.75rem' }}>
        <button onClick={goToRecipes} style={navButtonStyle(view === 'recipes' || view === 'recipe-detail' || view === 'add-recipe')}>
          My Recipes
        </button>
        <button onClick={() => setView('preferences')} style={navButtonStyle(view === 'preferences')}>
          Preferences
        </button>
      </nav>

      {view === 'preferences' && (
        <>
          <p style={{ color: '#555' }}>
            Tell us what you like, what to avoid, and what you're aiming for. You can come back and change
            this anytime.
          </p>
          <Onboarding />
        </>
      )}

      {view === 'recipes' && (
        <RecipeLibrary
          onAddClick={() => setView('add-recipe')}
          onSelectRecipe={handleSelectRecipe}
          refreshKey={libraryRefreshKey}
        />
      )}

      {view === 'add-recipe' && <AddRecipe onSaved={handleRecipeSaved} onCancel={goToRecipes} />}

      {view === 'recipe-detail' && selectedRecipeId && (
        <RecipeDetail recipeId={selectedRecipeId} onBack={goToRecipes} />
      )}
    </div>
  )
}

function navButtonStyle(isActive) {
  return {
    background: 'none',
    border: 'none',
    borderBottom: isActive ? '2px solid #2f7a4d' : '2px solid transparent',
    color: isActive ? '#2f7a4d' : '#555',
    fontWeight: isActive ? 'bold' : 'normal',
    fontSize: '1rem',
    padding: '0.25rem 0',
    cursor: 'pointer',
  }
}

export default App
