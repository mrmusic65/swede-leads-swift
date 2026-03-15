import { Link } from 'react-router-dom';
import { Zap, ArrowLeft } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F5F0E8' }}>
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 lg:px-12 py-4 border-b" style={{ background: '#F5F0E8', borderColor: '#e5e2db' }}>
        <Link to="/auth" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#2d9f8f' }} role="img" aria-label="LeadRadar logotyp">
            <Zap className="w-4 h-4 text-white" aria-hidden="true" />
          </div>
          <span className="text-lg font-semibold tracking-tight" style={{ color: '#2c2a25' }}>LeadRadar</span>
        </Link>
        <Link to="/auth" className="flex items-center gap-1.5 text-sm font-medium" style={{ color: '#5c5850' }}>
          <ArrowLeft className="w-4 h-4" /> Tillbaka
        </Link>
      </header>

      <main className="flex-1 px-6 lg:px-12 py-16">
        <article className="max-w-2xl mx-auto prose" style={{ color: '#2c2a25' }}>
          <h1 className="text-3xl lg:text-4xl font-serif mb-8" style={{ fontFamily: '"Georgia", serif', color: '#2c2a25' }}>
            Integritetspolicy
          </h1>
          <p className="text-sm mb-6" style={{ color: '#9a9488' }}>Senast uppdaterad: 15 mars 2026</p>

          <h2 className="text-xl font-semibold mt-8 mb-3" style={{ color: '#2c2a25' }}>1. Personuppgiftsansvarig</h2>
          <p className="text-sm leading-relaxed mb-4" style={{ color: '#5c5850' }}>
            LeadRadar ("vi", "oss") är personuppgiftsansvarig för behandlingen av dina personuppgifter i enlighet med EU:s dataskyddsförordning (GDPR).
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-3" style={{ color: '#2c2a25' }}>2. Vilka uppgifter samlar vi in?</h2>
          <ul className="text-sm leading-relaxed mb-4 list-disc pl-5 space-y-1" style={{ color: '#5c5850' }}>
            <li><strong>Kontouppgifter:</strong> E-postadress och lösenord vid registrering.</li>
            <li><strong>Profiluppgifter:</strong> Namn och visningsnamn som du anger.</li>
            <li><strong>Användningsdata:</strong> Sökfilter, sparade bevakningar och exporthistorik.</li>
            <li><strong>Kontaktmeddelanden:</strong> Namn, e-post och meddelande via kontaktformuläret.</li>
            <li><strong>Teknisk data:</strong> IP-adress, webbläsartyp och enhetsuppgifter via cookies.</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8 mb-3" style={{ color: '#2c2a25' }}>3. Hur använder vi uppgifterna?</h2>
          <ul className="text-sm leading-relaxed mb-4 list-disc pl-5 space-y-1" style={{ color: '#5c5850' }}>
            <li>Tillhandahålla och förbättra tjänsten.</li>
            <li>Skicka bevakningsnotiser och servicemeddelanden.</li>
            <li>Hantera ditt konto och din prenumeration.</li>
            <li>Analysera användningsmönster för att förbättra produkten.</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8 mb-3" style={{ color: '#2c2a25' }}>4. Rättslig grund</h2>
          <p className="text-sm leading-relaxed mb-4" style={{ color: '#5c5850' }}>
            Vi behandlar dina personuppgifter baserat på: (a) fullgörande av avtal (för att leverera tjänsten), (b) berättigat intresse (för att förbättra tjänsten), och (c) samtycke (för marknadsföring).
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-3" style={{ color: '#2c2a25' }}>5. Delning av uppgifter</h2>
          <p className="text-sm leading-relaxed mb-4" style={{ color: '#5c5850' }}>
            Vi säljer aldrig dina personuppgifter. Vi delar uppgifter med betrodda tjänsteleverantörer (hosting, e-post, betalning) som är nödvändiga för att driva tjänsten, och dessa är bundna av databehandlingsavtal.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-3" style={{ color: '#2c2a25' }}>6. Lagring och säkerhet</h2>
          <p className="text-sm leading-relaxed mb-4" style={{ color: '#5c5850' }}>
            Dina uppgifter lagras inom EU/EES. Vi använder kryptering och andra tekniska skyddsåtgärder för att skydda dina data.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-3" style={{ color: '#2c2a25' }}>7. Dina rättigheter</h2>
          <p className="text-sm leading-relaxed mb-4" style={{ color: '#5c5850' }}>
            Enligt GDPR har du rätt att: begära tillgång till dina uppgifter, rätta felaktiga uppgifter, radera dina uppgifter, begränsa behandlingen, invända mot behandling, och begära dataportabilitet. Kontakta oss via kontaktformuläret för att utöva dina rättigheter.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-3" style={{ color: '#2c2a25' }}>8. Cookies</h2>
          <p className="text-sm leading-relaxed mb-4" style={{ color: '#5c5850' }}>
            Vi använder nödvändiga cookies för att tjänsten ska fungera (t.ex. inloggningssessioner). Dessa kräver inget samtycke enligt GDPR.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-3" style={{ color: '#2c2a25' }}>9. Kontakt</h2>
          <p className="text-sm leading-relaxed mb-4" style={{ color: '#5c5850' }}>
            Har du frågor om vår hantering av personuppgifter? Kontakta oss via kontaktformuläret på vår webbplats eller skicka e-post till info@leadradar.nu.
          </p>
        </article>
      </main>
    </div>
  );
}
