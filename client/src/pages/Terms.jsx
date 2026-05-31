import { Link } from 'react-router-dom';
import { Scale, ArrowLeft, ShieldCheck, FileText, AlertTriangle, Ban, Phone, UserCheck } from 'lucide-react';

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
    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sky-500 flex-shrink-0" />
    <span>{children}</span>
  </li>
);

export default function Terms() {
  return (
    <div className="min-h-screen bg-[#02050c] text-slate-100 font-sans pt-16">
      {/* Hero */}
      <div className="border-b border-slate-800/60 bg-slate-950/60 backdrop-blur-sm sticky top-16 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20">
              <Scale className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h1 className="text-sm font-black text-white tracking-tight uppercase">Terms &amp; Conditions</h1>
              <p className="text-[10px] text-slate-500 font-medium">Last Updated: {LAST_UPDATED}</p>
            </div>
          </div>
          <Link
            to="/signup"
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-sky-400 transition-colors font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-5">

        {/* Intro banner */}
        <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 px-6 py-4 text-sm text-sky-200 leading-relaxed">
          Welcome to <strong className="text-sky-400">DriveLegal AI</strong>. By creating an account or using any part of this platform, you confirm that you have read, understood, and agree to be bound by these Terms &amp; Conditions. If you do not agree, please do not use the platform.
        </div>

        {/* A. Acceptance */}
        <Section icon={FileText} color="bg-sky-500/10 border border-sky-500/20 text-sky-400" title="A.  Acceptance of Terms">
          <p>
            By registering an account on DriveLegal AI and accessing any of its features, you agree to comply with all rules, policies, and guidelines set forth in these Terms &amp; Conditions. These terms apply to all users of the platform including drivers, fleet operators, and any other persons who access the service.
          </p>
          <p>
            DriveLegal AI reserves the right to modify these terms at any time. Continued use of the platform after changes are posted constitutes your acceptance of the revised terms.
          </p>
        </Section>

        {/* B. Service Description */}
        <Section icon={ShieldCheck} color="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" title="B.  Service Description">
          <p>DriveLegal AI is an intelligent road compliance and driver safety platform. The platform provides the following services:</p>
          <ul className="space-y-2 mt-1">
            <Bullet>Route Risk Analysis — AI-powered route safety scoring and hazard identification</Bullet>
            <Bullet>Document Vault — Secure storage and validation of driver documents (licence, RC, insurance, PUC)</Bullet>
            <Bullet>Fine Analysis — Traffic fine lookup, penalty estimation, and compliance guidance</Bullet>
            <Bullet>Driver Awareness Tools — State Explorer with traffic law education and quizzes</Bullet>
            <Bullet>Compliance Reporting — Auto-generated PDF reports for route audits and document status</Bullet>
            <Bullet>AI Assistance — Intelligent chatbot for compliance queries, legal awareness, and platform navigation</Bullet>
          </ul>
          <p className="text-slate-400 text-xs mt-2">All services are provided on a best-effort basis and are subject to availability of third-party data sources.</p>
        </Section>

        {/* C. User Responsibilities */}
        <Section icon={UserCheck} color="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400" title="C.  User Responsibilities">
          <p>As a user of DriveLegal AI, you agree to:</p>
          <ul className="space-y-2 mt-1">
            <Bullet>Provide accurate, truthful, and up-to-date personal information during registration and profile setup</Bullet>
            <Bullet>Upload only genuine and valid documents — falsified or fraudulent documents are strictly prohibited</Bullet>
            <Bullet>Maintain the confidentiality and security of your account credentials</Bullet>
            <Bullet>Use the platform only for lawful purposes and in compliance with applicable Indian laws and regulations</Bullet>
            <Bullet>Not attempt to reverse-engineer, scrape, or exploit any part of the platform's infrastructure</Bullet>
            <Bullet>Not share your account access with unauthorised third parties</Bullet>
          </ul>
        </Section>

        {/* D. Disclaimer */}
        <Section icon={AlertTriangle} color="bg-amber-500/10 border border-amber-500/20 text-amber-400" title="D.  Disclaimer">
          <p>
            DriveLegal AI is designed as a <strong className="text-white">guidance and awareness tool</strong> to help drivers understand road safety, compliance requirements, and document obligations under Indian motor vehicle law.
          </p>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2 text-amber-100">
            <p className="font-bold text-amber-400 text-xs uppercase tracking-wider">The platform does NOT replace:</p>
            <ul className="space-y-1.5">
              <Bullet>Official decisions or orders issued by Government authorities, RTOs, or traffic police</Bullet>
              <Bullet>Advice from qualified legal advisors or advocates</Bullet>
              <Bullet>Official RTO determinations regarding document validity, vehicle fitness, or licensing</Bullet>
              <Bullet>Judicial or quasi-judicial proceedings related to traffic violations</Bullet>
            </ul>
          </div>
          <p className="text-xs text-slate-400">Always consult official government portals (Parivahan, MoRTH) or a legal professional for binding legal advice.</p>
        </Section>

        {/* E. Limitation of Liability */}
        <Section icon={Scale} color="bg-rose-500/10 border border-rose-500/20 text-rose-400" title="E.  Limitation of Liability">
          <p>To the fullest extent permitted by applicable law, DriveLegal AI and its operators shall not be liable for any direct, indirect, incidental, or consequential damages arising from:</p>
          <ul className="space-y-2 mt-1">
            <Bullet>Incorrect, incomplete, or fraudulent data uploaded by users</Bullet>
            <Bullet>Changes in Government policy, motor vehicle regulations, or traffic laws</Bullet>
            <Bullet>Outages, errors, or data inaccuracies from third-party services (routing providers, geocoding APIs, email services)</Bullet>
            <Bullet>Decisions made by users relying solely on AI-generated route or compliance advice</Bullet>
            <Bullet>Losses arising from account misuse or unauthorised account access due to user negligence</Bullet>
          </ul>
        </Section>

        {/* F. Account Termination */}
        <Section icon={Ban} color="bg-slate-700/50 border border-slate-600/30 text-slate-300" title="F.  Account Termination">
          <p>
            DriveLegal AI reserves the right to suspend, restrict, or permanently terminate any account without prior notice if the account is found to be involved in:
          </p>
          <ul className="space-y-2 mt-1">
            <Bullet>Misuse or abuse of platform services</Bullet>
            <Bullet>Upload of falsified, forged, or fraudulent documents</Bullet>
            <Bullet>Any form of fraud, impersonation, or identity theft</Bullet>
            <Bullet>Activities that violate applicable Indian law or these Terms</Bullet>
            <Bullet>Systematic scraping, automated abuse, or denial-of-service attacks against the platform</Bullet>
          </ul>
          <p className="text-xs text-slate-400 mt-2">Users may request account deletion by contacting support. Data retention policies apply as described in the Privacy Policy.</p>
        </Section>

        {/* G. Contact */}
        <Section icon={Phone} color="bg-sky-500/10 border border-sky-500/20 text-sky-400" title="G.  Contact Information">
          <p>For questions, concerns, or disputes related to these Terms &amp; Conditions, please contact us:</p>
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-1 text-sm">
            <p className="font-black text-white text-xs uppercase tracking-wider mb-2">DriveLegal AI — Legal Team</p>
            <p>Email: <a href="mailto:support@drivelegal.ai" className="text-sky-400 hover:underline">support@drivelegal.ai</a></p>
            <p className="text-xs text-slate-500 mt-2">We aim to respond to all inquiries within 3–5 business days.</p>
          </div>
        </Section>

        {/* Footer nav */}
        <div className="border-t border-slate-800/60 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>© {new Date().getFullYear()} DriveLegal AI. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="text-sky-400 hover:underline">Privacy Policy</Link>
            <Link to="/signup" className="text-slate-400 hover:text-white transition-colors">Back to Signup</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
