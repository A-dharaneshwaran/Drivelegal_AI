import { Link } from 'react-router-dom';
import { Lock, ArrowLeft, Database, Eye, ShieldCheck, Globe, UserCog, Mail } from 'lucide-react';

const LAST_UPDATED = 'May 30, 2025';

const Section = ({ icon: Icon, color, title, children }) => (
  <section className="bg-slate-900/50 border border-slate-800/70 rounded-2xl p-6 md:p-8 space-y-4">
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-xl ${color} flex-shrink-0`}>
        <Icon className="w-5 h-5" />
      </div>
      <h2 className="text-base md:text-lg font-black text-white tracking-tight">{title}</h2>
    </div>
    <div className="text-sm text-slate-300 leading-relaxed space-y-3 pl-1">
      {children}
    </div>
  </section>
);

const Bullet = ({ children }) => (
  <li className="flex items-start gap-2">
    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
    <span>{children}</span>
  </li>
);

export default function Privacy() {
  return (
    <div className="min-h-screen bg-[#02050c] text-slate-100 font-sans pt-16">
      {/* Sticky header */}
      <div className="border-b border-slate-800/60 bg-slate-950/60 backdrop-blur-sm sticky top-16 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <Lock className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-sm font-black text-white tracking-tight uppercase">Privacy Policy</h1>
              <p className="text-[10px] text-slate-500 font-medium">Last Updated: {LAST_UPDATED}</p>
            </div>
          </div>
          <Link
            to="/signup"
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition-colors font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-5">

        {/* Intro banner */}
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-6 py-4 text-sm text-emerald-200 leading-relaxed">
          At <strong className="text-emerald-400">DriveLegal AI</strong>, your privacy is a core commitment, not an afterthought. This Privacy Policy explains what personal data we collect, how we use it, how we protect it, and what rights you hold over your information.
        </div>

        {/* A. Information Collected */}
        <Section icon={Database} color="bg-sky-500/10 border border-sky-500/20 text-sky-400" title="A.  Information We Collect">
          <p>When you register and use DriveLegal AI, we collect the following categories of information:</p>

          <div className="space-y-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-2">
              <p className="text-[10px] font-black text-sky-400 uppercase tracking-widest">Account &amp; Identity Data</p>
              <ul className="space-y-1.5">
                <Bullet>Full name and display name</Bullet>
                <Bullet>Email address (used for authentication and communications)</Bullet>
                <Bullet>Phone number (optional, for contact preferences)</Bullet>
                <Bullet>Encrypted password hash (we never store plain-text passwords)</Bullet>
              </ul>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-2">
              <p className="text-[10px] font-black text-sky-400 uppercase tracking-widest">Vehicle &amp; Document Data</p>
              <ul className="space-y-1.5">
                <Bullet>Vehicle registration number, type, and registration year</Bullet>
                <Bullet>Uploaded documents: Driving Licence, Registration Certificate (RC), Insurance Certificate, Pollution Under Control (PUC) certificate</Bullet>
                <Bullet>Document expiry dates and validation status</Bullet>
              </ul>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-2">
              <p className="text-[10px] font-black text-sky-400 uppercase tracking-widest">Usage &amp; Activity Data</p>
              <ul className="space-y-1.5">
                <Bullet>Route search history (source, destination, safety score)</Bullet>
                <Bullet>AI chat interaction logs (used to improve response quality)</Bullet>
                <Bullet>Document upload and validation timestamps</Bullet>
                <Bullet>Platform feature usage analytics (aggregated and anonymised)</Bullet>
              </ul>
            </div>
          </div>
        </Section>

        {/* B. How Data Is Used */}
        <Section icon={Eye} color="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400" title="B.  How We Use Your Data">
          <p>Your data is used exclusively to deliver and improve the DriveLegal AI platform experience:</p>
          <ul className="space-y-2 mt-1">
            <Bullet>
              <span><strong className="text-white">Compliance Scoring</strong> — Your document status and vehicle details are used to compute your real-time compliance and travel-readiness score.</span>
            </Bullet>
            <Bullet>
              <span><strong className="text-white">Route Analysis</strong> — Route searches are used to generate AI safety briefs, corridor hazard overlays, and enforcement zone awareness.</span>
            </Bullet>
            <Bullet>
              <span><strong className="text-white">Document Validation</strong> — Uploaded documents are cross-referenced with expiry data and category rules to flag compliance gaps.</span>
            </Bullet>
            <Bullet>
              <span><strong className="text-white">Account Security</strong> — Email, password hash, and session tokens are used to authenticate users and protect accounts from unauthorised access.</span>
            </Bullet>
            <Bullet>
              <span><strong className="text-white">Platform Improvement</strong> — Aggregated and anonymised usage data helps us improve features, fix bugs, and enhance AI accuracy.</span>
            </Bullet>
          </ul>
          <p className="text-xs text-slate-400 mt-2">We do <strong className="text-white">not</strong> sell, rent, or trade your personal data to any third parties for commercial purposes.</p>
        </Section>

        {/* C. Data Protection */}
        <Section icon={ShieldCheck} color="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" title="C.  Data Protection &amp; Security">
          <p>We implement multiple layers of security to protect your personal information:</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
            {[
              {
                title: 'Password Hashing',
                desc: 'All passwords are hashed using bcrypt with a secure salt. We never store or transmit plain-text passwords.',
                color: 'border-emerald-500/20 bg-emerald-500/5',
                label: 'text-emerald-400'
              },
              {
                title: 'Secure Auth Tokens',
                desc: 'Authentication uses short-lived JWT tokens with automatic expiry and refresh controls.',
                color: 'border-sky-500/20 bg-sky-500/5',
                label: 'text-sky-400'
              },
              {
                title: 'Access Controls',
                desc: 'All sensitive API endpoints are protected by authentication middleware. User data is isolated by account ID.',
                color: 'border-indigo-500/20 bg-indigo-500/5',
                label: 'text-indigo-400'
              }
            ].map(card => (
              <div key={card.title} className={`rounded-xl border p-4 space-y-1.5 ${card.color}`}>
                <p className={`text-[10px] font-black uppercase tracking-widest ${card.label}`}>{card.title}</p>
                <p className="text-xs text-slate-300 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-400 mt-1">
            While we take all reasonable precautions, no digital system is 100% immune to security threats. Please use a strong, unique password and keep your login credentials private.
          </p>
        </Section>

        {/* D. Third-Party Services */}
        <Section icon={Globe} color="bg-amber-500/10 border border-amber-500/20 text-amber-400" title="D.  Third-Party Services">
          <p>DriveLegal AI integrates with the following third-party services to power its features. Each has its own privacy policy:</p>
          <div className="space-y-2.5 mt-1">
            {[
              {
                name: 'OpenStreetMap / Nominatim',
                use: 'Location geocoding and address autocomplete. Queries are sent without personally identifiable information.',
                url: 'https://osmfoundation.org/wiki/Privacy_Policy'
              },
              {
                name: 'OSRM / OpenRouteService',
                use: 'Route geometry calculation and driving distance estimation. Only coordinate pairs are transmitted.',
                url: 'https://openrouteservice.org/privacy/'
              },
              {
                name: 'Email Provider',
                use: 'Transactional emails including account verification, password reset, and security alerts.',
                url: null
              },
              {
                name: 'Google Gemini AI',
                use: 'AI-generated route safety briefs and compliance chatbot responses. Route context (not personal data) is used.',
                url: 'https://policies.google.com/privacy'
              }
            ].map(svc => (
              <div key={svc.name} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3.5 flex flex-col sm:flex-row sm:items-start gap-2">
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider w-40 flex-shrink-0">{svc.name}</span>
                <span className="text-xs text-slate-300 flex-1">{svc.use}</span>
                {svc.url && (
                  <a href={svc.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-sky-400 hover:underline flex-shrink-0">
                    Privacy Policy →
                  </a>
                )}
              </div>
            ))}
          </div>
        </Section>

        {/* E. User Rights */}
        <Section icon={UserCog} color="bg-violet-500/10 border border-violet-500/20 text-violet-400" title="E.  Your Rights">
          <p>You have the following rights over your personal data on DriveLegal AI:</p>
          <ul className="space-y-2 mt-1">
            <Bullet>
              <span><strong className="text-white">View Profile Data</strong> — Access your full profile, vehicle details, and document records from the Profile page.</span>
            </Bullet>
            <Bullet>
              <span><strong className="text-white">Update Profile Data</strong> — Edit your name, phone number, vehicle details, and other profile information at any time.</span>
            </Bullet>
            <Bullet>
              <span><strong className="text-white">Delete Uploaded Documents</strong> — Remove individual documents from your Smart Vault at any time via the Document Vault page.</span>
            </Bullet>
            <Bullet>
              <span><strong className="text-white">Request Account Deletion</strong> — You may request full deletion of your account and all associated personal data by contacting our privacy team. Requests are processed within 30 days.</span>
            </Bullet>
            <Bullet>
              <span><strong className="text-white">Data Portability</strong> — You may request a structured export of your stored compliance and route data by emailing privacy@drivelegal.ai.</span>
            </Bullet>
          </ul>
        </Section>

        {/* F. Contact */}
        <Section icon={Mail} color="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" title="F.  Privacy Contact">
          <p>For all privacy-related inquiries, data deletion requests, or concerns about how your data is handled:</p>
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-1 text-sm">
            <p className="font-black text-white text-xs uppercase tracking-wider mb-2">DriveLegal AI — Privacy Office</p>
            <p>Email: <a href="mailto:privacy@drivelegal.ai" className="text-emerald-400 hover:underline">privacy@drivelegal.ai</a></p>
            <p className="text-xs text-slate-500 mt-2">We aim to respond to all privacy requests within 5–7 business days.</p>
          </div>
        </Section>

        {/* Footer nav */}
        <div className="border-t border-slate-800/60 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>© {new Date().getFullYear()} DriveLegal AI. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link to="/terms" className="text-sky-400 hover:underline">Terms &amp; Conditions</Link>
            <Link to="/signup" className="text-slate-400 hover:text-white transition-colors">Back to Signup</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
