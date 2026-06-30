export default function AuthError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted">
      <div className="text-center px-6">
        <h1 className="text-xl font-extrabold mb-2.5">Sign in failed</h1>
        <p className="text-muted-foreground mb-6">Something went wrong during authentication.</p>
        <a
          href="/"
          className="inline-block bg-gold text-white font-bold text-sm px-6 py-2.5 rounded-lg no-underline"
        >
          Try again
        </a>
      </div>
    </div>
  )
}
