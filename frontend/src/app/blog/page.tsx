import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { Clock, ArrowRight } from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { BLOG_POSTS } from '@/data/blogPosts';

export const metadata: Metadata = {
  title: 'Blog — BizListPlace',
  description:
    'Practical guides for Pakistani businesses: Google Business Profile, local SEO, reviews, WhatsApp Business and growing a local shop online.',
};

export default function BlogPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <Breadcrumbs items={[{ label: 'Blog' }]} />
      <div className="space-y-3">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">BizListPlace Blog</h1>
        <p className="text-slate-600 leading-relaxed">
          Practical guides for local businesses — how to be found on Google Maps, earn
          five-star reviews, and turn WhatsApp into sales.
        </p>
      </div>
      <div className="grid gap-6">
        {BLOG_POSTS.map((post) => (
          <article key={post.slug} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-semibold border border-teal-200">
                {post.category}
              </span>
              <span>{post.publishedAt}</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {post.readTime}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              <Link href={`/blog/${post.slug}`} className="hover:text-teal-700">
                {post.title}
              </Link>
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">{post.excerpt}</p>
            <Link
              href={`/blog/${post.slug}`}
              className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:text-teal-800"
            >
              Read guide <ArrowRight className="w-4 h-4" />
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
