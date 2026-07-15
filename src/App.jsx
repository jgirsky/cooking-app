import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

function App() {
  const [status, setStatus] = useState('checking...')

  useEffect(() => {
    async function checkConnection() {
      // Simple check: ask Supabase for the current session.
      // This works even before we've created any tables.
      const { error } = await supabase.auth.getSession()
      if (error) {
        setStatus(`Connection error: ${error.message}`)
      } else {
        setStatus('Connected to Supabase ✅')
      }
    }
    checkConnection()
  }, [])

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '2rem', maxWidth: 480, margin: '0 auto' }}>
      <h1>Cooking App</h1>
      <p>Starter project is running.</p>
      <p>Supabase status: {status}</p>
    </div>
  )
}

export default App
