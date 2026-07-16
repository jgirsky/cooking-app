import Onboarding from './Onboarding'

function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '2rem', maxWidth: 640, margin: '0 auto' }}>
      <h1>Cooking App</h1>
      <p style={{ color: '#555' }}>
        Tell us what you like, what to avoid, and what you're aiming for. You can come back and
        change this anytime.
      </p>
      <Onboarding />
    </div>
  )
}

export default App
