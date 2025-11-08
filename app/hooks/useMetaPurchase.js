// ========================================
// File: app/hooks/useMetaPurchase.js
// ========================================
'use client';
import { useEffect, useRef, useState } from 'react';
import { getOrCreateEventId, clearEventId } from '../lib/meta';
import { sendCapiPurchase } from '../lib/api';

export function useMetaPurchase({ order, autoFire = true, testEventCode }) {
  const firedRef = useRef(false);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  async function fire() {
    if (firedRef.current) return;
    firedRef.current = true;
    setStatus('running');
    setError(null);

    const eventId = getOrCreateEventId();

    try {
      if (typeof window !== 'undefined' && window.fbq) {
        window.fbq(
          'track',
          'Purchase',
          { value: Number(order?.total || 0), currency: 'NGN' },
          { eventID: eventId }
        );
      }
    } catch {}

    try {
      await sendCapiPurchase({
        eventId,
        value: Number(order?.total || 0),
        currency: 'NGN',
        items:
          Array.isArray(order?.items) &&
          order.items.map((i) => ({
            id: String(i.sku ?? i.id ?? i.name ?? 'unknown'),
            quantity: Number(i.qty ?? i.quantity ?? 1),
            item_price: Number(i.price ?? i.item_price ?? 0),
          })),
        customer: {
          email: order?.email,
          phone: order?.phone,
          external_id: order?.userId || order?.customerId,
          first_name: order?.firstName,
          last_name: order?.lastName,
          city: order?.city,
          state: order?.state,
          zip: order?.zip,
          country: order?.country,
        },
        testEventCode,
      });
      setStatus('ok');
      clearEventId();
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  useEffect(() => {
    if (autoFire && order?.id) fire();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFire, order?.id]);

  return { status, error, fire };
}
