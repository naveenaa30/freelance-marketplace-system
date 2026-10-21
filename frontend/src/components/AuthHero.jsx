export default function AuthHero({ subtitle }) {
  return (
    <div className="auth-hero">
      <div className="scene">
        <div className="cube">
          <div className="f1">💼</div>
          <div className="f2">💻</div>
          <div className="f3">🎨</div>
          <div className="f4">⭐</div>
          <div className="f5">💬</div>
          <div className="f6">🚀</div>
        </div>
      </div>
      <p>{subtitle}</p>
    </div>
  );
}