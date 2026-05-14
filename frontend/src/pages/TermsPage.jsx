import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, ChevronRight } from 'lucide-react';

const AGREEMENT_VERSION = 1; // increment this whenever terms materially change
const AGREEMENT_DATE    = 'May 14, 2026';

const sections = [
  { id: 'definitions',   title: 'I. Definitions' },
  { id: 'agent',         title: 'II. Agent Terms' },
  { id: 'seller',        title: 'III. Seller Terms' },
  { id: 'disbursements', title: 'IV. Withdrawals & Disbursements' },
  { id: 'listings',      title: 'V. Listing Standards' },
  { id: 'conduct',       title: 'VI. Prohibited Activities' },
  { id: 'liability',     title: 'VII. Platform Liability' },
  { id: 'termination',   title: 'VIII. Suspension & Termination' },
  { id: 'amendments',    title: 'IX. Amendments' },
  { id: 'governing',     title: 'X. Governing Law' },
];

export default function TermsPage() {
  const [activeSection, setActiveSection] = useState('definitions');
  const navigate = useNavigate();

  const scrollTo = (id) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-cream">
      {/* Hero banner */}
      <div className="bg-forest-900 text-white py-14 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-white/50 text-sm mb-6">
            <Link to="/" className="hover:text-white/80 transition-colors flex items-center gap-1">
              <Home size={14} /> Home
            </Link>
            <ChevronRight size={14} />
            <span className="text-white/80">Platform Agreement</span>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl font-bold mb-3">
            Core<span className="text-clay-400">City</span> Platform Agreement
          </h1>
          <p className="text-white/60 text-sm">
            Version {AGREEMENT_VERSION} &nbsp;·&nbsp; Effective {AGREEMENT_DATE} &nbsp;·&nbsp; Ref: CCPA-2026-01
          </p>
          <p className="text-white/70 mt-4 max-w-2xl leading-relaxed">
            This Agreement governs all Agents and Sellers operating on the CoreCity Properties
            platform. Read it carefully before registering or listing a property.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10 flex gap-8">
        {/* Sticky sidebar nav */}
        <aside className="hidden lg:block w-56 shrink-0">
          <div className="sticky top-24 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-2">Contents</p>
            {sections.map(({ id, title }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className={`w-full text-left text-sm px-3 py-2 rounded-xl transition-colors font-medium ${
                  activeSection === id
                    ? 'bg-forest-800 text-white'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-forest-800'
                }`}
              >
                {title}
              </button>
            ))}
          </div>
        </aside>

        {/* Main content */}
        <article className="flex-1 min-w-0 space-y-12 pb-20">

          {/* Preamble */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
            <p className="text-sm text-amber-900 leading-relaxed">
              <strong>Preamble:</strong> By registering as an Agent or Seller, or by listing any property on
              the CoreCity Properties platform, you acknowledge that you have read, understood, and
              agree to be legally bound by all provisions of this Agreement.
            </p>
          </div>

          {/* I. Definitions */}
          <Section id="definitions" title="I. Definitions" onView={setActiveSection}>
            <Table
              headers={['Term', 'Meaning']}
              rows={[
                ['Platform', 'The CoreCity Properties digital marketplace and all associated services'],
                ['Agent', 'A licensed real estate professional who lists and manages properties on behalf of owners'],
                ['Seller', 'A property owner who lists their own properties directly on the Platform'],
                ['Property', 'Any real estate asset (residential or commercial) listed for sale or rent'],
                ['Listing', 'A property record published on the Platform, including all details, images, and pricing'],
                ['Transaction', 'Any completed sale or rental agreement brokered through the Platform'],
                ['Commission', 'The monetary amount payable to the Party upon successful completion of a Transaction'],
                ['Disbursement', 'The formal release and transfer of Commission funds to the Party'],
                ['Reservation', 'A formal intent-to-purchase or intent-to-rent record initiated by a buyer or tenant'],
                ['Platform Wallet', 'An internal digital wallet maintained by CoreCity for Agent commission accumulation'],
                ['Property Value', 'The agreed transaction price (sale) or agreed periodic rent (rental)'],
              ]}
            />
          </Section>

          {/* II. Agent Terms */}
          <Section id="agent" title="II. Agent Terms" onView={setActiveSection}>
            <SubHeading>2.1 Role Definition</SubHeading>
            <p className="text-gray-700 text-sm leading-relaxed mb-4">
              A <strong>Licensed Agent</strong> is a professional intermediary who lists properties on behalf of
              property owners, manages the full lifecycle of listed properties (viewings, negotiations,
              reservation handling), and acts in the interest of both the property owner and the
              Platform's buyer/tenant community.
            </p>

            <SubHeading>2.2 Eligibility</SubHeading>
            <NumberedList items={[
              'Hold a valid real estate licence or professional certification recognised in their jurisdiction',
              'Provide accurate identification and contact information at registration',
              'Maintain an active, verified account on the Platform',
              "Comply with the Platform's Know Your Customer (KYC) requirements",
            ]} />

            <SubHeading>2.3 Agent Obligations</SubHeading>
            <NumberedList items={[
              'Accuracy of Listings — Ensure all property details, descriptions, images, and pricing are accurate and not misleading',
              'Owner Authorisation — Obtain express written consent from the property owner before listing any property',
              'Owner Contact Details — Provide the owner\'s full name, phone number, bank name, account number, and account name at the time of listing',
              'Timely Communication — Respond to reservation requests and Platform notifications within 48 hours',
              'Confidentiality — Not disclose buyer, tenant, or owner personal data to any third party without prior consent',
              'Compliance — Abide by all applicable real estate laws, AML regulations, and consumer protection statutes',
              'Conflict of Interest — Disclose any personal or financial relationship with the owner or buyer that may affect impartiality',
            ]} />

            <SubHeading>2.4 Agent Commission Structure</SubHeading>
            <CommissionCard
              rows={[
                { label: 'Agent Commission', rate: '7%', method: 'Credited to Platform Wallet' },
                { label: 'CoreCity Platform Fee', rate: '3%', method: 'Retained by CoreCity' },
                { label: 'Total', rate: '10%', method: '—', total: true },
              ]}
              color="forest"
            />
            <div className="mt-4 space-y-3 text-sm text-gray-700 leading-relaxed">
              <p>Commission is earned <strong>only upon a Transaction being marked as fully completed</strong> by the Platform. The Agent's 7% is credited to their Platform Wallet. Wallet balances may be withdrawn subject to the Platform's withdrawal policy (see Part IV).</p>
              <p className="font-semibold text-gray-800">No commission is payable where:</p>
              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                <li>A Transaction is cancelled due to the Agent's negligence or misconduct</li>
                <li>The property listing is found to be fraudulent or materially misrepresented</li>
                <li>The Agent fails to meet KYC requirements at the time of disbursement</li>
              </ul>
            </div>
          </Section>

          {/* III. Seller Terms */}
          <Section id="seller" title="III. Seller Terms" onView={setActiveSection}>
            <SubHeading>3.1 Role Definition</SubHeading>
            <p className="text-gray-700 text-sm leading-relaxed mb-4">
              A <strong>Property Seller</strong> is a property owner who lists their own properties directly on
              the Platform, manages their listings, responds to enquiries, and interfaces directly
              with buyers or tenants. Disbursements are made directly to their registered bank account.
            </p>

            <SubHeading>3.2 Eligibility</SubHeading>
            <NumberedList items={[
              'Be the legal owner (or authorised representative) of any property listed',
              'Provide valid proof of ownership upon request by the Platform',
              'Provide accurate personal identification, phone number, and bank account details for disbursement',
              "Comply with the Platform's KYC requirements",
            ]} />

            <SubHeading>3.3 Seller Obligations</SubHeading>
            <NumberedList items={[
              'Proof of Ownership — Maintain and provide valid documentation confirming legal ownership of every listed property',
              'Accurate Representation — Ensure all listing information (price, size, amenities, location, images) is truthful and current',
              'Bank Account Accuracy — Provide and maintain correct bank name, account number, and account name; CoreCity shall not be liable for misdirected payments due to incorrect details',
              'Reservation Honouring — Honour all confirmed reservations and not privately renegotiate terms outside the Platform',
              'Availability — Be reachable at the registered phone number during active listing periods',
              'Compliance — Comply with all applicable property laws, tax obligations, and consumer protection regulations',
              'Non-Circumvention — Not solicit buyers or tenants identified through the Platform to transact outside the Platform to avoid Platform fees',
            ]} />

            <SubHeading>3.4 Seller Commission Structure</SubHeading>
            <CommissionCard
              rows={[
                { label: 'Seller Disbursement Bonus', rate: '5%', method: 'Bank Transfer (direct payout)' },
                { label: 'CoreCity Platform Fee', rate: '5%', method: 'Retained by CoreCity' },
                { label: 'Total', rate: '10%', method: '—', total: true },
              ]}
              color="clay"
            />
            <div className="mt-4 space-y-3 text-sm text-gray-700 leading-relaxed">
              <p>The Seller's 5% bonus is disbursed via <strong>direct bank transfer</strong> upon the Platform marking the Transaction complete. Processing may take <strong>3–7 business days</strong>. Reprocessing fees for failed transfers due to incorrect details shall be borne by the Seller.</p>
              <p className="font-semibold text-gray-800">No disbursement shall be made where:</p>
              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                <li>The property listing is found to be fraudulent or in breach of ownership claims</li>
                <li>The Transaction is reversed or voided due to Seller-side breach</li>
                <li>The Seller's bank account details are unverifiable or rejected after two attempts</li>
              </ul>
            </div>
          </Section>

          {/* IV. Withdrawals & Disbursements */}
          <Section id="disbursements" title="IV. Withdrawals & Disbursements" onView={setActiveSection}>
            <SubHeading>4.1 Agent Withdrawals</SubHeading>
            <NumberedList items={[
              'Agents may submit withdrawal requests for their Platform Wallet balance at any time through the Dashboard',
              'Requests are subject to Platform review and shall be processed within 5 business days',
              'A minimum withdrawal threshold of ₦5,000 (or equivalent) applies',
              'CoreCity reserves the right to place a temporary hold on requests pending transaction settlement confirmation',
            ]} />

            <SubHeading>4.2 Seller Disbursements</SubHeading>
            <NumberedList items={[
              'Seller disbursements are initiated by the Platform Admin upon confirmation of transaction completion',
              'The Seller will receive a notification confirming disbursement initiation',
              "Sellers must not request disbursement before the buyer's payment has been confirmed and cleared",
            ]} />

            <SubHeading>4.3 Dispute on Disbursement</SubHeading>
            <p className="text-sm text-gray-700 leading-relaxed">
              Any dispute regarding disbursement amounts must be raised in writing to{' '}
              <a href="mailto:support@corecity.properties" className="text-forest-700 underline">
                support@corecity.properties
              </a>{' '}
              within <strong>14 days</strong> of the disbursement date. Disputes raised after this window may not be entertained.
            </p>
          </Section>

          {/* V. Listing Standards */}
          <Section id="listings" title="V. Property Listing Standards" onView={setActiveSection}>
            <p className="text-sm text-gray-700 leading-relaxed mb-4">Both Agents and Sellers must ensure all listings meet the following standards:</p>
            <NumberedList items={[
              'Images — A minimum of three (3) clear, current photographs must be uploaded. AI-generated or stock images are prohibited',
              'Pricing — Must reflect genuine market rates. Artificially inflated prices for commission manipulation are prohibited',
              'Location — State and LGA must be accurately selected. The full address is disclosed to confirmed reservation holders only',
              'Amenities — Only amenities physically present and operational at the property may be listed',
              'Property Type — The correct property type and listing type (sale / rent) must be selected',
            ]} />
            <div className="mt-4 bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-700">
              CoreCity reserves the right to delist, suspend, or permanently remove any listing that violates these standards, without prior notice.
            </div>
          </Section>

          {/* VI. Prohibited Activities */}
          <Section id="conduct" title="VI. Prohibited Activities" onView={setActiveSection}>
            <p className="text-sm text-gray-700 mb-4">All registered Parties are strictly prohibited from:</p>
            <NumberedList items={[
              'Fraud — Submitting false property information, fabricating ownership documents, or impersonating property owners',
              'Fee Avoidance — Directing buyers or tenants to transact outside the Platform to circumvent Platform fees',
              'Data Misuse — Using buyer, tenant, or owner data for purposes beyond facilitating the specific transaction',
              'Misrepresentation — Falsely claiming credentials, licences, or property ownership',
              'Harassment — Harassing, threatening, or engaging in discriminatory conduct towards any Platform user or staff',
              'Manipulation — Artificially inflating property views, reservation counts, or transaction values to distort commissions',
            ]} />
            <div className="mt-4 bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-700">
              Breach of any of the above shall result in immediate account suspension, commission forfeiture, and may be reported to relevant regulatory authorities.
            </div>
          </Section>

          {/* VII. Platform Liability */}
          <Section id="liability" title="VII. Platform Liability" onView={setActiveSection}>
            <NumberedList items={[
              'CoreCity acts as a facilitating marketplace and is not a party to any transaction between the Seller/Agent and the buyer/tenant',
              'CoreCity makes no warranty as to the accuracy of listings published by Agents or Sellers and shall not be liable for buyer or tenant losses arising from misrepresentation',
              'CoreCity shall not be liable for delays caused by banking system failures, third-party payment processor issues, or regulatory holds',
              'The Platform\'s total liability to any registered Party shall not exceed the total commissions earned by that Party in the twelve (12) months preceding the claim',
            ]} />
          </Section>

          {/* VIII. Suspension & Termination */}
          <Section id="termination" title="VIII. Suspension & Termination" onView={setActiveSection}>
            <SubHeading>8.1 By CoreCity</SubHeading>
            <p className="text-sm text-gray-700 leading-relaxed mb-3">CoreCity may suspend or terminate a Party's account with or without notice for:</p>
            <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600 mb-4">
              <li>Breach of any provision of this Agreement</li>
              <li>Suspected fraudulent activity pending investigation</li>
              <li>Regulatory requirement or court order</li>
              <li>Prolonged inactivity (&gt;12 months with no active listings)</li>
            </ul>
            <p className="text-sm text-gray-700 leading-relaxed">Upon termination for cause (fraud, misconduct), CoreCity reserves the right to withhold pending funds pending investigation.</p>

            <SubHeading>8.2 By the Party</SubHeading>
            <p className="text-sm text-gray-700 leading-relaxed">A Party may deactivate their account by submitting a written request to CoreCity. Outstanding obligations (active listings, confirmed reservations) must be resolved before deactivation is processed.</p>
          </Section>

          {/* IX. Amendments */}
          <Section id="amendments" title="IX. Amendments" onView={setActiveSection}>
            <p className="text-sm text-gray-700 leading-relaxed">
              CoreCity reserves the right to amend the terms of this Agreement at any time. Registered
              Parties will be notified via the email address on their account no fewer than{' '}
              <strong>14 days</strong> before any material change takes effect. Continued use of the
              Platform after the effective date of an amendment constitutes acceptance of the revised terms.
            </p>
          </Section>

          {/* X. Governing Law */}
          <Section id="governing" title="X. Governing Law & Dispute Resolution" onView={setActiveSection}>
            <NumberedList items={[
              'This Agreement shall be governed by and construed in accordance with the laws of the Federal Republic of Nigeria',
              "Any dispute arising from this Agreement shall first be referred to CoreCity's internal dispute resolution process",
              'If unresolved within 30 days, disputes shall be submitted to binding arbitration under the rules of the Lagos Court of Arbitration',
              'Nothing in this clause prevents either Party from seeking urgent injunctive relief from a court of competent jurisdiction',
            ]} />
          </Section>

          {/* Back CTA */}
          <div className="text-center pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-400 mb-4">
              CoreCity Properties — Building Trust in Every Transaction<br />
              Document Version {AGREEMENT_VERSION} &nbsp;·&nbsp; Last Updated {AGREEMENT_DATE}
            </p>
            <button
              onClick={() => navigate(-1)}
              className="btn-primary inline-block"
            >
              ← Back
            </button>
          </div>
        </article>
      </div>
    </div>
  );
}

// ── Helper sub-components ──────────────────────────────────────

function Section({ id, title, children, onView }) {
  const ref = React.useRef(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) onView(id); },
      { rootMargin: '-20% 0px -60% 0px' }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [id, onView]);

  return (
    <div id={id} ref={ref} className="scroll-mt-24">
      <h2 className="font-display text-xl font-bold text-forest-900 mb-5 pb-3 border-b border-gray-200">
        {title}
      </h2>
      {children}
    </div>
  );
}

function SubHeading({ children }) {
  return <h3 className="font-semibold text-gray-800 mt-5 mb-2 text-sm uppercase tracking-wide">{children}</h3>;
}

function NumberedList({ items }) {
  return (
    <ol className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-sm text-gray-700 leading-relaxed">
          <span className="shrink-0 w-6 h-6 bg-forest-800 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
            {i + 1}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}

function Table({ headers, rows }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-forest-800 text-white">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map(([term, meaning], i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">{term}</td>
              <td className="px-4 py-3 text-gray-600">{meaning}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CommissionCard({ rows, color }) {
  const accent = color === 'clay' ? 'bg-clay-500' : 'bg-forest-800';
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-sm">
        <thead className={`${accent} text-white`}>
          <tr>
            {['Component', 'Rate', 'Payout Method'].map((h) => (
              <th key={h} className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map(({ label, rate, method, total }, i) => (
            <tr key={i} className={total ? 'bg-gray-50 font-bold' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="px-4 py-3 text-gray-800">{label}</td>
              <td className="px-4 py-3 text-gray-800">{rate}</td>
              <td className="px-4 py-3 text-gray-600">{method}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
