import { useState } from 'react'

const SUGGESTED_GROUPS = [
  { label: 'Cuisine', options: ['Italian', 'Mexican', 'Asian', 'Mediterranean', 'American', 'Indian', 'French', 'Middle Eastern'] },
  { label: 'Meal type', options: ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert'] },
  { label: 'Difficulty', options: ['Easy', 'Medium', 'Hard'] },
  { label: 'Other', options: ['Quick', 'Weeknight', 'Meal prep', 'Comfort food', 'Healthy', 'Spicy', 'One pot'] },
]

// Controlled multi-select of tag names (plain strings). Suggested chips per
// category, plus a free-text box for anything not in the suggested lists.
function TagPicker({ value, onChange }) {
  const [customInput, setCustomInput] = useState('')

  function isSelected(name) {
    return value.some((v) => v.toLowerCase() === name.toLowerCase())
  }

  function toggleTag(name) {
    if (isSelected(name)) {
      onChange(value.filter((v) => v.toLowerCase() !== name.toLowerCase()))
    } else {
      onChange([...value, name])
    }
  }

  function handleAddCustom() {
    const trimmed = customInput.trim()
    if (!trimmed) return
    if (!isSelected(trimmed)) {
      onChange([...value, trimmed])
    }
    setCustomInput('')
  }

  function handleCustomKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddCustom()
    }
  }

  return (
    <div>
      {value.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
          {value.map((name) => (
            <span key={name} style={selectedPillStyle}>
              {name}
              <button
                type="button"
                onClick={() => toggleTag(name)}
                style={pillRemoveStyle}
                aria-label={`Remove tag ${name}`}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      {SUGGESTED_GROUPS.map((group) => (
        <div key={group.label} style={{ marginBottom: '0.5rem' }}>
          <div style={groupLabelStyle}>{group.label}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {group.options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => toggleTag(option)}
                style={isSelected(option) ? chipActiveStyle : chipStyle}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
        <input
          type="text"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={handleCustomKeyDown}
          placeholder="Other tag..."
          style={inputStyle}
        />
        <button type="button" onClick={handleAddCustom} style={smallButtonStyle}>
          + Add
        </button>
      </div>
    </div>
  )
}

const groupLabelStyle = {
  fontSize: '0.8rem',
  color: '#777',
  marginBottom: '0.25rem',
}

const chipStyle = {
  padding: '0.3rem 0.65rem',
  fontSize: '0.85rem',
  backgroundColor: 'white',
  color: '#444',
  border: '1px solid #ccc',
  borderRadius: '999px',
  cursor: 'pointer',
}

const chipActiveStyle = {
  ...chipStyle,
  backgroundColor: '#2f7a4d',
  color: 'white',
  border: '1px solid #2f7a4d',
}

const selectedPillStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.35rem',
  padding: '0.2rem 0.5rem',
  fontSize: '0.85rem',
  backgroundColor: '#eaf3ee',
  color: '#2f7a4d',
  borderRadius: '999px',
}

const pillRemoveStyle = {
  background: 'none',
  border: 'none',
  color: '#2f7a4d',
  cursor: 'pointer',
  fontSize: '0.75rem',
  padding: 0,
  lineHeight: 1,
}

const inputStyle = {
  padding: '0.4rem',
  fontSize: '0.9rem',
  border: '1px solid #ccc',
  borderRadius: '4px',
  fontFamily: 'inherit',
  flex: 1,
}

const smallButtonStyle = {
  padding: '0.4rem 0.75rem',
  fontSize: '0.85rem',
  backgroundColor: 'white',
  color: '#2f7a4d',
  border: '1px solid #2f7a4d',
  borderRadius: '4px',
  cursor: 'pointer',
}

export default TagPicker
