import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

function MealDetail({ mealId, onBack }) {
  const [meal, setMeal] = useState(null)
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    async function loadMeal() {
      setLoading(true)
      const [{ data: mealData, error: mealError }, { data: slotData, error: slotError }] = await Promise.all([
        supabase.from('meals').select('*').eq('id', mealId).single(),
        supabase
          .from('meal_component_slots')
          .select('id, components(name), recipes(id, title)')
          .eq('meal_id', mealId),
      ])

      if (mealError) {
        setErrorMessage(`Couldn't load meal: ${mealError.message}`)
      } else {
        setMeal(mealData)
      }
      if (!slotError) {
        setSlots(slotData || [])
      }
      setLoading(false)
    }
    loadMeal()
  }, [mealId])

  if (loading) return <p>Loading...</p>
  if (errorMessage) return <p style={{ color: '#b3261e' }}>{errorMessage}</p>
  if (!meal) return null

  return (
    <div>
      <button onClick={onBack} style={backButtonStyle}>
        ← Back to Meals
      </button>

      <h2>{meal.name}</h2>

      <ul style={{ paddingLeft: '1.25rem' }}>
        {slots.map((slot) => (
          <li key={slot.id} style={{ marginBottom: '0.25rem' }}>
            <strong>{slot.components?.name}:</strong> {slot.recipes?.title}
          </li>
        ))}
      </ul>
    </div>
  )
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

export default MealDetail
