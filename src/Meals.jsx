import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

function Meals({ onAddClick, onSelectMeal, refreshKey }) {
  const [meals, setMeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    async function loadMeals() {
      setLoading(true)
      const { data, error } = await supabase
        .from('meals')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        setErrorMessage(`Couldn't load meals: ${error.message}`)
      } else {
        setMeals(data || [])
      }
      setLoading(false)
    }
    loadMeals()
  }, [refreshKey])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0 }}>Meals</h2>
        <button onClick={onAddClick} style={buttonStyle}>
          + Build a meal
        </button>
      </div>

      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        Composed meals built from swappable components — e.g. "Chicken Bowl" made of a protein, a
        vegetable, and a grain you can mix and match.
      </p>

      {loading && <p>Loading...</p>}
      {errorMessage && <p style={{ color: '#b3261e' }}>{errorMessage}</p>}
      {!loading && meals.length === 0 && !errorMessage && (
        <p style={{ color: '#555' }}>No meals yet. Tag some recipes as components first, then build a meal.</p>
      )}

      <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {meals.map((meal) => (
          <li key={meal.id} onClick={() => onSelectMeal(meal.id)} style={cardStyle}>
            <strong>{meal.name}</strong>
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

const buttonStyle = {
  padding: '0.5rem 1rem',
  fontSize: '0.95rem',
  backgroundColor: '#2f7a4d',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
}

export default Meals
