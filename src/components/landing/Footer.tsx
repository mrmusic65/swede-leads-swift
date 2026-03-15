import { Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="py-10 px-6 lg:px-12 border-t" style={{ background: '#F5F0E8', borderColor: '#e5e2db' }}>
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#2d9f8f' }} role="img" aria-label="LeadRadar logotyp">
            <Zap className="w-3.5 h-3.5 text-white" aria-hidden="true" />
          </div>
          <span className="text-sm font-semibold" style={{ color: '#2c2a25' }}>LeadRadar</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/integritetspolicy" className="text-xs hover:underline" style={{ color: '#9a9488' }}>
            Integritetspolicy
          </Link>
          <p className="text-xs" style={{ color: '#9a9488' }}>
            © {new Date().getFullYear()} LeadRadar. Alla rättigheter förbehållna.
          </p>
        </div>
      </div>
    </footer>
  );
}
