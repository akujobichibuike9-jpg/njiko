export function Maintenance() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg)', color: 'var(--text)', padding: 24, textAlign: 'center' }}>
      <div style={{ maxWidth: 340 }}>
        <div style={{ fontSize: 44, marginBottom: 16 }}>🛠️</div>
        <h1 style={{ fontFamily: 'var(--disp)', fontWeight: 600, fontSize: 24, letterSpacing: '-.02em' }}>We'll be back soon</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 10, lineHeight: 1.6 }}>The app is down for maintenance right now. Please check back in a little while — thanks for your patience.</p>
      </div>
    </div>
  );
}
