// Match the Portal's Event Overviews grouping and financial calculations.
export const eventKey = name => (name || '').trim().toLowerCase();

export function buildEventOverviews({ budget, earnings, inHouse, cards, tickets }) {
  const groups = new Map();
  const bucket = name => {
    const key = (name || '').trim() || 'Uncategorized';
    if (!groups.has(key)) groups.set(key, { name: key, date: null, earnings: 0, costs: 0, earningsRows: [], expenseRows: [] });
    return groups.get(key);
  };
  earnings.forEach(row => {
    const group = bucket(row.event);
    group.earnings += Number(row.amount || 0);
    group.earningsRows.push(row);
  });
  budget.forEach(row => {
    const group = bucket(row.event_name);
    group.expenseRows.push(row);
    if (row.type === 'Purchase' || row.type === 'In-Kind') group.costs += Number(row.amount || 0);
  });
  inHouse.forEach(row => {
    const group = [...groups.values()].find(g => eventKey(g.name) === eventKey(row.name));
    if (group) group.date = row.date || group.date;
  });
  const financials = [...groups.values()].map(g => ({ ...g, net: g.earnings - g.costs }));
  financials.sort((a, b) => a.date && b.date ? b.date.localeCompare(a.date) : a.date ? -1 : b.date ? 1 : b.net - a.net);

  const byKey = new Map();
  function ensure(name) {
    const key = eventKey(name);
    if (!byKey.has(key)) byKey.set(key, {
      name, date: null, earnings: 0, costs: 0, net: 0, earningsRows: [], expenseRows: [],
      image_url: null, checklist: [], ticketQty: 0, ticketRevenue: 0, ticketFees: 0, ticketNet: 0, rsvpQty: 0,
    });
    return byKey.get(key);
  }
  financials.forEach(group => {
    if (group.name !== 'Uncategorized') {
      const card = ensure(group.name);
      Object.assign(card, group, { name: card.name });
    }
  });
  tickets.forEach(row => {
    const name = row.event_title || row.event_slug;
    if (!name) return;
    const card = ensure(name);
    card.date ||= row.event_date || null;
    if (row.kind === 'rsvp') card.rsvpQty += Number(row.quantity || 0);
    else {
      card.ticketQty += Number(row.quantity || 0);
      card.ticketRevenue += Number(row.amount || 0);
      card.ticketFees += Number(row.paypal_fee || 0);
      card.ticketNet += Number(row.net_amount ?? row.amount ?? 0);
    }
  });
  cards.forEach(row => {
    const card = ensure(row.event_name);
    card.date = row.event_date || card.date;
    card.image_url = row.image_url || null;
    card.checklist = Array.isArray(row.checklist) ? row.checklist : [];
  });
  return { cards: [...byKey.values()], financials };
}
