import React, { useState } from 'react';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Section({ label, children }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 14 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function FeaturedCard({ icon, iconBg, iconColor, title, description, meta, badge, badgeColor, badgeBg }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#fff',
        border: `1.5px solid ${hovered ? '#0d2550' : '#e8eaed'}`,
        borderRadius: 12,
        padding: '20px',
        cursor: 'pointer',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'all 150ms ease',
      }}
    >
      <div style={{
        width: 44, height: 44, background: iconBg, borderRadius: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, marginBottom: 14, color: iconColor,
      }}>
        {icon}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#0d2550' }}>{title}</div>
        {badge && (
          <span style={{
            background: badgeBg, color: badgeColor, fontSize: 10, fontWeight: 700,
            padding: '2px 8px', borderRadius: 10, whiteSpace: 'nowrap', flexShrink: 0,
            border: `1px solid ${badgeColor}33`,
          }}>
            {badge}
          </span>
        )}
      </div>
      <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5, margin: '0 0 12px' }}>{description}</p>
      <div style={{ fontSize: 12, color: '#9ca3af', fontWeight: 500 }}>{meta}</div>
    </div>
  );
}

function GuideCard({ icon, iconBg, title, description, badge, badgeColor }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#fff',
        border: `1.5px solid ${hovered ? '#0d2550' : '#e8eaed'}`,
        borderRadius: 12,
        padding: '18px 20px',
        cursor: 'pointer',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'all 150ms ease',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
      }}
    >
      <div style={{
        width: 36, height: 36, background: iconBg, borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#0d2550' }}>{title}</div>
          {badge && (
            <span style={{
              background: `${badgeColor}18`, color: badgeColor, fontSize: 10, fontWeight: 700,
              padding: '2px 7px', borderRadius: 8, whiteSpace: 'nowrap', flexShrink: 0,
              border: `1px solid ${badgeColor}33`,
            }}>
              {badge}
            </span>
          )}
        </div>
        <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>{description}</div>
      </div>
    </div>
  );
}

function TipCard({ emoji, title, tip }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#fff',
        border: `1.5px solid ${hovered ? '#0d2550' : '#e8eaed'}`,
        borderRadius: 12,
        overflow: 'hidden',
        display: 'flex',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'all 150ms ease',
        cursor: 'default',
      }}
    >
      <div style={{ width: 4, background: '#e8b84b', flexShrink: 0 }} />
      <div style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 20 }}>{emoji}</span>
          <span style={{ fontWeight: 700, fontSize: 14, color: '#0d2550' }}>{title}</span>
        </div>
        <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>{tip}</div>
      </div>
    </div>
  );
}

function VideoCard({ title, duration, subtitle }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#fff',
        border: `1.5px solid ${hovered ? '#0d2550' : '#e8eaed'}`,
        borderRadius: 12,
        overflow: 'hidden',
        cursor: 'pointer',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'all 150ms ease',
      }}
    >
      {/* Thumbnail */}
      <div style={{
        height: 160, background: '#0d2550',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: hovered ? '#e8b84b' : 'rgba(232,184,75,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 150ms ease',
        }}>
          <span style={{ fontSize: 22, color: '#0d2550', marginLeft: 3 }}>▶</span>
        </div>
      </div>
      {/* Meta */}
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#0d2550', lineHeight: 1.3 }}>{title}</div>
          <span style={{
            fontSize: 11, fontWeight: 700, color: '#6b7280',
            background: '#f0f2f5', padding: '2px 7px', borderRadius: 6,
            whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            {duration}
          </span>
        </div>
        <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>{subtitle}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const GUIDES = [
  { icon: '🔨', iconBg: '#EFF6FF', title: 'How auctions work', description: 'The bidding process, countdown timer, and how winners are determined.', badge: 'Beginner', badgeColor: '#1D9E75' },
  { icon: '🔧', iconBg: '#F5F3FF', title: 'Creating a repair order', description: 'Log mechanical work, parts, labor, and link to a vehicle.', badge: null, badgeColor: null },
  { icon: '🚚', iconBg: '#FFFBEB', title: 'Scheduling transport', description: 'Assign a driver, set pickup address, track delivery status.', badge: null, badgeColor: null },
  { icon: '📄', iconBg: '#ECFDF5', title: 'Printing the buy sheet', description: 'Generate the one-page PDF with deal details for the driver.', badge: null, badgeColor: null },
  { icon: '👥', iconBg: '#EFF6FF', title: 'Adding users and locations', description: 'Invite team members, set roles, configure store locations.', badge: 'Manager', badgeColor: '#1a3d76' },
  { icon: '📊', iconBg: '#F5F3FF', title: 'Reading the GM dashboard', description: 'Understand spend, margins, store performance, and arbitrations.', badge: 'Manager', badgeColor: '#1a3d76' },
];

const TIPS = [
  { emoji: '🔢', title: 'VIN is your best friend', tip: 'Every vehicle is tracked by its last 6 VIN digits. Search any page by VIN to find the full history — bids, transport, title status.' },
  { emoji: '📈', title: 'Mileage only goes up', tip: 'The system blocks lower mileage entries. This protects everyone from odometer issues on titles. Contact admin to override.' },
  { emoji: '⏱', title: 'Auction closes at the deadline', tip: 'When the countdown hits zero, bidding locks automatically. No extensions, no exceptions. Highest bid wins.' },
  { emoji: '📸', title: 'More photos = faster sales', tip: "Vehicles with 4+ photos sell faster. Buyers at other stores can't see the car — your photos are the test drive." },
  { emoji: '🧾', title: 'Print buy sheet before pickup', tip: 'Generate the PDF before the driver goes. It has all deal details, payoff info, and title status — everything accounting needs.' },
  { emoji: '⚡', title: 'No need to refresh', tip: 'Inventory and auction updates are live. New listings and bids appear instantly on your screen — no refresh needed.' },
];

const VIDEOS = [
  { title: 'Your first login', duration: '2:47', subtitle: 'Account setup and navigation tour' },
  { title: 'Adding a vehicle end-to-end', duration: '4:12', subtitle: 'VIN entry, deal record, photos' },
  { title: 'How to bid in an auction', duration: '3:30', subtitle: 'Live bidding, strategies, and winning' },
];

const GLOSSARY = [
  { term: 'VIN', def: 'Vehicle Identification Number — 17-character code unique to every vehicle. Last 6 digits used for tracking.' },
  { term: 'Cost basis', def: 'Purchase price + overhead + recon costs. The true all-in cost of a vehicle before it sells.' },
  { term: 'Floor price', def: 'Minimum acceptable bid for a vehicle in auction. Set by Tri-State at intake.' },
  { term: 'Lien / payoff', def: 'Money owed to a lender on the vehicle. Must be paid off before title can transfer.' },
  { term: 'Electronic title', def: 'Title held digitally by the state (ELT). No paper title — transfer processed electronically.' },
  { term: 'RO', def: 'Repair Order — a logged work order for mechanical or reconditioning work done to a vehicle.' },
  { term: 'Recon', def: 'Reconditioning — the process of preparing a vehicle for sale (detail, repairs, photography).' },
  { term: 'Awarded', def: 'When an auction closes and a vehicle is assigned to the highest bidder above floor price.' },
  { term: 'Buy sheet', def: 'A one-page printed PDF summarizing all deal details for a specific vehicle acquisition.' },
  { term: 'Intake', def: 'The initial stage when a vehicle enters the system — before recon or auction listing.' },
  { term: 'Transport leg', def: 'A scheduled vehicle delivery from the acquisition location to a winning store.' },
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function Help() {
  const [search, setSearch] = useState('');

  const q = search.trim().toLowerCase();

  const filteredGuides = q
    ? GUIDES.filter(g => g.title.toLowerCase().includes(q) || g.description.toLowerCase().includes(q))
    : GUIDES;

  const filteredTips = q
    ? TIPS.filter(t => t.title.toLowerCase().includes(q) || t.tip.toLowerCase().includes(q))
    : TIPS;

  const filteredGlossary = q
    ? GLOSSARY.filter(g => g.term.toLowerCase().includes(q) || g.def.toLowerCase().includes(q))
    : GLOSSARY;

  const showGuides = !q || filteredGuides.length > 0;
  const showTips = !q || filteredTips.length > 0;
  const showGlossary = !q || filteredGlossary.length > 0;

  return (
    <div style={{ background: '#f0f2f5', minHeight: '100vh', padding: '32px 28px', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        {/* Page header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0d2550', margin: 0 }}>Help Center</h1>
          <p style={{ fontSize: 14, color: '#9ca3af', marginTop: 4, marginBottom: 0 }}>
            Guides, tips, and reference for the MAG platform
          </p>
        </div>

        {/* Search bar */}
        <div style={{ position: 'relative', marginBottom: 32 }}>
          <span style={{
            position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
            fontSize: 20, color: '#9ca3af', pointerEvents: 'none',
          }}>
            🔍
          </span>
          <input
            type="text"
            placeholder="Search guides, tips, and glossary terms…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '14px 16px 14px 48px', fontSize: 15,
              border: '1.5px solid #e8eaed', borderRadius: 10, outline: 'none',
              background: '#fff', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Start here — always visible */}
        <Section label="Start here">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
            <FeaturedCard
              icon="🚀" iconBg="#0d2550" iconColor="#e8b84b"
              title="Getting started"
              description="Your first 10 minutes. Log in, find inventory, place your first bid."
              meta="5 steps · 3 min"
              badge="Start here" badgeColor="#e8b84b" badgeBg="rgba(232,184,75,0.15)"
            />
            <FeaturedCard
              icon="🚗" iconBg="#1D9E75" iconColor="#fff"
              title="Adding a vehicle"
              description="How to enter a new acquisition — VIN, deal record, pickup scheduling, mileage."
              meta="8 steps · 5 min"
            />
            <FeaturedCard
              icon="📋" iconBg="#BA7517" iconColor="#fff"
              title="Running an inspection"
              description="Post-sale checklist, OBD scan photo, flagging repairs."
              meta="6 steps · 4 min"
            />
          </div>
        </Section>

        {/* All guides */}
        {showGuides && (
          <Section label="All guides">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {filteredGuides.map((g, i) => (
                <GuideCard key={i} {...g} />
              ))}
            </div>
            {filteredGuides.length === 0 && (
              <div style={{ fontSize: 13, color: '#9ca3af', padding: '16px 0' }}>No guides match your search.</div>
            )}
          </Section>
        )}

        {/* Pro tips */}
        {showTips && (
          <Section label="Pro tips for car guys">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
              {filteredTips.map((t, i) => (
                <TipCard key={i} {...t} />
              ))}
            </div>
            {filteredTips.length === 0 && (
              <div style={{ fontSize: 13, color: '#9ca3af', padding: '16px 0' }}>No tips match your search.</div>
            )}
          </Section>
        )}

        {/* Video walkthroughs — always visible */}
        <Section label="Video walkthroughs">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
            {VIDEOS.map((v, i) => (
              <VideoCard key={i} {...v} />
            ))}
          </div>
        </Section>

        {/* Glossary */}
        {showGlossary && (
          <Section label="Glossary">
            <div style={{
              background: '#fff', border: '1px solid #e8eaed', borderRadius: 12, overflow: 'hidden',
            }}>
              {filteredGlossary.length === 0 ? (
                <div style={{ fontSize: 13, color: '#9ca3af', padding: '20px 24px' }}>No glossary terms match your search.</div>
              ) : (
                filteredGlossary.map((g, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 16,
                      padding: '14px 20px',
                      background: i % 2 === 1 ? '#f9fafb' : '#fff',
                      borderBottom: i < filteredGlossary.length - 1 ? '1px solid #f0f2f5' : 'none',
                    }}
                  >
                    <div style={{
                      fontFamily: 'monospace', fontSize: 12, fontWeight: 700,
                      color: '#0d2550', background: '#f0f2f5',
                      padding: '4px 10px', borderRadius: 6,
                      whiteSpace: 'nowrap', flexShrink: 0, marginTop: 1,
                      letterSpacing: '.01em',
                    }}>
                      {g.term}
                    </div>
                    <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{g.def}</div>
                  </div>
                ))
              )}
            </div>
          </Section>
        )}

        {/* Contact support bar */}
        <div style={{
          background: '#0d2550', borderRadius: 12, padding: '24px 28px',
          marginTop: 32, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 28 }}>🎧</span>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>Still stuck? We're here to help.</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 2 }}>
                Reach out and we'll walk you through it.
              </div>
            </div>
          </div>
          <button style={{
            background: '#e8b84b', color: '#0d2550', border: 'none',
            padding: '10px 22px', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}>
            Contact support
          </button>
        </div>

      </div>
    </div>
  );
}
