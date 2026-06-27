export default function AuthError() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--surface)'
    }}>
      <div style={{ textAlign: 'center', padding: '0 24px' }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 10 }}>Sign in failed</h1>
        <p style={{ color: 'var(--text-2)', marginBottom: 24 }}>Something went wrong during authentication.</p>
        <a href="/" style={{
          display: 'inline-block', background: 'var(--gold)', color: '#fff',
          fontWeight: 700, fontSize: 14, padding: '10px 24px', borderRadius: 8,
          textDecoration: 'none'
        }}>Try again</a>
      </div>
    </div>
  )
}
