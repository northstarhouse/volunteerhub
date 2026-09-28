import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEventOverviews } from './eventOverviews.js';

test('combines Portal metadata, manual finances, paid tickets and free RSVPs', () => {
  const { cards, financials } = buildEventOverviews({
    earnings: [{ event: 'Autumn Gala', amount: '100', earning_source: 'Donation' }],
    budget: [
      { event_name: 'Autumn Gala', type: 'Purchase', amount: '30' },
      { event_name: 'Autumn Gala', type: 'In-Kind', amount: '20' },
      { event_name: 'Autumn Gala', type: 'Budget', amount: '999' },
    ],
    inHouse: [{ name: 'autumn gala', date: '2026-10-01' }],
    cards: [{ event_name: ' AUTUMN GALA ', event_date: '2026-10-03', image_url: '/flyer.jpg', checklist: [{ label: 'Flyer designed', done: true }] }],
    tickets: [
      { event_title: 'Autumn Gala', kind: 'ticket', quantity: 2, amount: '80', paypal_fee: '3', net_amount: '77' },
      { event_title: 'Autumn Gala', kind: 'ticket', quantity: 1, amount: '40', net_amount: null },
      { event_title: 'Autumn Gala', kind: 'rsvp', quantity: 5, amount: 999 },
    ],
  });
  assert.equal(cards.length, 1);
  const card = cards[0];
  assert.equal(card.date, '2026-10-03');
  assert.equal(card.image_url, '/flyer.jpg');
  assert.deepEqual(card.checklist, [{ label: 'Flyer designed', done: true }]);
  assert.equal(card.earnings, 100);
  assert.equal(card.costs, 50);
  assert.equal(card.ticketRevenue, 120);
  assert.equal(card.ticketFees, 3);
  assert.equal(card.ticketNet, 117);
  assert.equal(card.ticketQty, 3);
  assert.equal(card.rsvpQty, 5);
  assert.equal(card.ticketNet + card.net, 167);
  assert.equal(card.expenseRows.length, 3);
  assert.equal(financials[0].net, 50); // Portal P&L excludes website ticket totals.
});

test('retains metadata-only and ticket-only events, with uncategorized finances only in P&L', () => {
  const { cards, financials } = buildEventOverviews({
    budget: [{ event_name: null, type: 'Purchase', amount: 12 }], earnings: [],
    inHouse: [{ name: 'Calendar only', date: '2026-10-01' }],
    cards: [{ event_name: 'Planning only', checklist: null }],
    tickets: [{ event_slug: 'ticket-only', event_date: '2026-11-01', quantity: 1, amount: 10, net_amount: 0 }],
  });
  assert.deepEqual(cards.map(c => c.name).sort(), ['Planning only', 'ticket-only']);
  assert.equal(cards.find(c => c.name === 'ticket-only').ticketNet, 0);
  assert.deepEqual(cards.find(c => c.name === 'Planning only').checklist, []);
  assert.equal(financials[0].name, 'Uncategorized');
  assert.equal(financials[0].net, -12);
});

test('empty sources show no fabricated events or amounts', () => {
  assert.deepEqual(buildEventOverviews({ budget: [], earnings: [], inHouse: [], cards: [], tickets: [] }), { cards: [], financials: [] });
});
