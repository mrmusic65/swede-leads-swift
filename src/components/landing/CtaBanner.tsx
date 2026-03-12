interface CtaBannerProps {
  onSignUp: () => void;
}

export default function CtaBanner({ onSignUp }: CtaBannerProps) {
  return (
    <section className="py-24 px-6 lg:px-12" style={{ background: '#2c2a25' }}>
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl lg:text-4xl font-serif mb-5" style={{ color: '#fff', fontFamily: '"Georgia", serif' }}>
          Redo att hitta dina nästa kunder?
        </h2>
        <p className="text-base mb-10" style={{ color: '#9a9488' }}>
          Kom igång gratis, inga kreditkort, inga bindningstider.
        </p>
        <button
          onClick={onSignUp}
          className="h-13 px-10 rounded-full text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{ background: '#2d9f8f' }}
        >
          Skapa gratis konto
        </button>
      </div>
    </section>
  );
}
