import React from 'react';

const fmt$ = (n) => `$${Math.round(n).toLocaleString()}`;

export function computeMonthPace(vehicles, monthlyOverhead) {
  const now = new Date();
  const year = now.getFullYear(), month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = now.getDate();
  const monthStart = new Date(year, month, 1);

  const soldMTD = (vehicles || []).filter(v =>
    v.status === 'sold' && v.soldPrice != null && v.soldDate &&
    new Date(v.soldDate + 'T12:00:00') >= monthStart
  );

  const dailyGross = new Array(daysInMonth + 1).fill(0);
  soldMTD.forEach(v => {
    const d = new Date(v.soldDate + 'T12:00:00').getDate();
    dailyGross[d] += parseFloat(v.soldGross) || 0;
  });

  const points = [];
  let running = 0;
  for (let d = 1; d <= today; d++) {
    running += dailyGross[d];
    points.push({ day: d, value: running });
  }
  const actualToday = points.length ? points[points.length - 1].value : 0;
  const targetToday = monthlyOverhead * (today / daysInMonth);

  return { daysInMonth, today, points, actualToday, targetToday, ahead: actualToday >= targetToday, unitsMTD: soldMTD.length };
}

// Plain-English pace chart: solid line = actual gross so far this month,
// dashed line = overhead spread evenly across the month. Green when the
// solid line is above the dashed one, red when it's below — that's the
// entire read.
export default function MonthPaceChart({ vehicles, monthlyOverhead, height = 220, compact = false }) {
  const { daysInMonth, today, points, actualToday, targetToday, ahead } = computeMonthPace(vehicles, monthlyOverhead);
  const color = ahead ? '#065f46' : '#991b1b';
  const fillColor = ahead ? 'rgba(6,95,70,0.10)' : 'rgba(153,27,27,0.10)';

  const yMax = Math.max(monthlyOverhead, actualToday, 1) * 1.15;
  const padL = compact ? 8 : 60, padR = compact ? 8 : 16, padT = compact ? 6 : 16, padB = compact ? 6 : 26;
  const w = 640, h = height;
  const plotW = w - padL - padR, plotH = h - padT - padB;

  const x = (day) => padL + (plotW * (day - 1)) / Math.max(daysInMonth - 1, 1);
  const y = (val) => padT + plotH - (plotH * Math.min(val, yMax)) / yMax;

  const targetPath = `M ${x(1)} ${y(0)} L ${x(daysInMonth)} ${y(monthlyOverhead)}`;
  const actualLine = points.map(p => `${x(p.day)},${y(p.value)}`).join(' ');
  const actualArea = points.length
    ? `M ${x(1)} ${y(0)} L ${points.map(p => `${x(p.day)} ${y(p.value)}`).join(' L ')} L ${x(points[points.length - 1].day)} ${y(0)} Z`
    : '';
  const gridLines = compact ? [] : [0, 0.25, 0.5, 0.75, 1].map(f => yMax * f);

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height, display: 'block' }}>
        {gridLines.map((gv, i) => (
          <g key={i}>
            <line x1={padL} y1={y(gv)} x2={w - padR} y2={y(gv)} stroke="#f3f4f6" strokeWidth={1} />
            <text x={padL - 8} y={y(gv) + 4} textAnchor="end" fontSize={10} fill="#9ca3af">
              {gv >= 1000 ? `$${Math.round(gv / 1000)}k` : fmt$(gv)}
            </text>
          </g>
        ))}
        <path d={targetPath} stroke="#9ca3af" strokeWidth={compact ? 1.5 : 2} strokeDasharray="5 4" fill="none" />
        {points.length > 0 && (
          <>
            <path d={actualArea} fill={fillColor} stroke="none" />
            <polyline points={actualLine} fill="none" stroke={color} strokeWidth={compact ? 2 : 2.5} />
            <circle cx={x(today)} cy={y(actualToday)} r={compact ? 3 : 4} fill={color} />
          </>
        )}
        {!compact && (
          <>
            <text x={x(1)} y={h - 8} fontSize={10} fill="#9ca3af" textAnchor="start">Day 1</text>
            <text x={x(today)} y={h - 8} fontSize={10} fill="#9ca3af" textAnchor="middle">Today</text>
            <text x={x(daysInMonth)} y={h - 8} fontSize={10} fill="#9ca3af" textAnchor="end">Day {daysInMonth}</text>
          </>
        )}
      </svg>
      {!compact && (
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginTop: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 14, height: 3, background: color, borderRadius: 2 }} />
            <span style={{ fontSize: 12, color: '#374151' }}>What we've actually made so far: <strong style={{ color }}>{fmt$(actualToday)}</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 14, height: 0, borderTop: '2px dashed #9ca3af' }} />
            <span style={{ fontSize: 12, color: '#374151' }}>What we need by today to cover overhead: <strong style={{ color: '#6b7280' }}>{fmt$(targetToday)}</strong></span>
          </div>
        </div>
      )}
    </div>
  );
}
