import { useState } from 'react'
import Onboarding from './Onboarding'
import RecipeLibrary from './RecipeLibrary'
import RecipeDetail from './RecipeDetail'
import AddRecipe from './AddRecipe'
import EditRecipe from './EditRecipe'
import Meals from './Meals'
import AddMeal from './AddMeal'
import MealDetail from './MealDetail'
import WeekPlanner from './WeekPlanner'

const RECIPE_VIEWS = ['recipes', 'recipe-detail', 'add-recipe', 'edit-recipe']
const MEAL_VIEWS = ['meals', 'meal-detail', 'add-meal']

function App() {
  const [view, setView] = useState('recipes')
  const [selectedRecipeId, setSelectedRecipeId] = useState(null)
  const [selectedMealId, setSelectedMealId] = useState(null)
  const [libraryRefreshKey, setLibraryRefreshKey] = useState(0)
  const [recipeDetailRefreshKey, setRecipeDetailRefreshKey] = useState(0)
  const [mealsRefreshKey, setMealsRefreshKey] = useState(0)

  function goToRecipes() {
    setView('recipes')
  }

  function goToMeals() {
    setView('meals')
  }

  function handleSelectRecipe(id) {
    setSelectedRecipeId(id)
    setView('recipe-detail')
  }

  function handleSelectMeal(id) {
    setSelectedMealId(id)
    setView('meal-detail')
  }

  function handleRecipeSaved() {
    setLibraryRefreshKey((key) => key + 1)
    goToRecipes()
  }

  function handleRecipeEdited() {
    setLibraryRefreshKey((key) => key + 1)
    setRecipeDetailRefreshKey((key) => key + 1)
    setView('recipe-detail')
  }

  function handleMealSaved() {
    setMealsRefreshKey((key) => key + 1)
    goToMeals()
  }

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '2rem', maxWidth: 640, margin: '0 auto' }}>
      <h1 style={{ marginBottom: '0.25rem' }}>Cooking App</h1>

      <nav style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid #ddd', paddingBottom: '0.75rem' }}>
        <button onClick={goToRecipes} style={navButtonStyle(RECIPE_VIEWS.includes(view))}>
          My Recipes
        </button>
        <button onClick={goToMeals} style={navButtonStyle(MEAL_VIEWS.includes(view))}>
          Meals
        </button>
        <button onClick={() => setView('plan')} style={navButtonStyle(view === 'plan')}>
          Weekly Plan
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
        <RecipeDetail
          recipeId={selectedRecipeId}
          onBack={goToRecipes}
          onEdit={() => setView('edit-recipe')}
          refreshKey={recipeDetailRefreshKey}
        />
      )}

      {view === 'edit-recipe' && selectedRecipeId && (
        <EditRecipe
          recipeId={selectedRecipeId}
          onSaved={handleRecipeEdited}
          onCancel={() => setView('recipe-detail')}
        />
      )}

      {view === 'meals' && (
        <Meals onAddClick={() => setView('add-meal')} onSelectMeal={handleSelectMeal} refreshKey={mealsRefreshKey} />
      )}

      {view === 'add-meal' && <AddMeal onSaved={handleMealSaved} onCancel={goToMeals} />}

      {view === 'meal-detail' && selectedMealId && (
        <MealDetail mealId={selectedMealId} onBack={goToMeals} />
      )}

      {view === 'plan' && <WeekPlanner />}
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
