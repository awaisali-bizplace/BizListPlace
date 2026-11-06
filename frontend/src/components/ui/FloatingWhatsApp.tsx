'use client';

import React from 'react';
import { MessageCircle } from 'lucide-react';

/**
 * Floating WhatsApp support button — ported from PKbizMap.
 * Renders ONLY when NEXT_PUBLIC_WHATSAPP_NUMBER is set (digits only,
 * country code, no +). The zip's number was deliberately NOT copied;
 * leave the env var empty to hide the button entirely.
 */
export function FloatingWhatsApp() {
  const number = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '').replace(/\D/g, '');
  if (!number) return null;
  return (
    <a
      href={`https://wa.me/${number}?text=${encodeURIComponent('Hello BizListPlace, I need help with a listing.')}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with BizListPlace support on WhatsApp"
      className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-lg hover:bg-[#1eb856] transition-colors"
    >
      <MessageCircle className="w-7 h-7" />
    </a>
  );
}
