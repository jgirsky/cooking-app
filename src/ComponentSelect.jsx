import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

// A dropdown of Component categories (Protein, Vegetable, Grain, etc.) with
// an inline "add a new one" option. Controlled: value is a component id or ''.
function ComponentSelect({ value, onChange }) {
  const [components, setComponents] = useState([])
  const [addingNew, setAddingNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    loadComponents()
  }, [])

  async function loadComponents() {
    const { data, error } = await supabase.from('components').select('*').order('name')
    if (!error) setComponents(data || [])
  }

  function handleSelectChange(e) {
    const val = e.target.value
    if (val === '__new__') {
      setAddingNew(true)
    } else {
      onChange(val)
    }
  }

  async function handleCreate() {
    const trimmed = newName.trim()
    if (!trimmed) return
    const { data, error } = await supabase.from('components').insert({ name: trimmed }).select('id').single()
    if (error) {
      setErrorMessage(`Couldn't create category: ${error.message}`)
      return
    }
    setErrorMessage('')
    setNewName('')
    setAddingNew(false)
    await loadComponents()
    onChange(data.id)
  }

  if (addingNew) {
    return (
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="e.g. Grain"
          style={inputStyle}
        />
        <button type="button" onClick={handleCreate} style={smallButtonStyle}>
          Create
        </button>
        <button type="button" onClick={() => setAddingNew(false)} style={smallCancelStyle}>
          Cancel
        </button>
        {errorMessage && <span style={{ color: '#b3261e', fontSize: '0.85rem' }}>{errorMessage}</span>}
      </div>
    )
  }

  return (
    <select value={value || ''} onChange={handleSelectChange} style={inputStyle}>
      <option value="">-- Select a category --</option>
      {components.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
      <option value="__new__">+ Add new category...</option>
    </select>
  )
}

const inputStyle = {
  padding: '0.5rem',
  fontSize: '1rem',
  border: '1px solid #ccc',
  borderRadius: '4px',
  fontFamily: 'inherit',
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

const smallCancelStyle = {
  padding: '0.4rem 0.75rem',
  fontSize: '0.9rem',
  backgroundColor: 'white',
  color: '#555',
  border: '1px solid #ccc',
  borderRadius: '4px',
  cursor: 'pointer',
}

export default ComponentSelect
