import React from 'react';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';
import { BusinessCard } from '@/components/business/BusinessCard';
import type { IBusiness } from '@bizlistplace/shared';

/** Recently listed businesses (ported from PKbizMap's RecentlyListed). */
export async function RecentlyListed() {
  const res = await fetchApi<{ data: IBusiness[] }>('/businesses/recent?limit=8');
  const businesses = Array.isArray(res?.data) ? res.data : [];
  if (businesses.length === 0) return null;
  return (
    <section className="w-full max-w-5xl mx-auto px-4 sm:px-10 lg:px-12 mt-14 sm:mt-16">
      <div className="flex items-end justify-between gap-3 mb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-xs font-bold uppercase tracking-wider mb-2">
            Fresh on BizListPlace
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Recently Listed</h2>
        </div>
        <Link href="/search" className="text-sm font-semibold text-teal-700 hover:text-teal-800 shrink-0">
          Browse all →
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {businesses.slice(0, 8).map((biz) => (
          <BusinessCard key={biz._id} business={biz} />
        ))}
      </div>
    </section>
  );
}
