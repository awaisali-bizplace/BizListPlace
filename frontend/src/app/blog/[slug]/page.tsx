import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Clock, ArrowLeft } from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { BLOG_POSTS, getPostBySlug } from '@/data/blogPosts';

export async function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: 'Blog — BizListPlace' };
  return { title: post.metaTitle, description: post.metaDescription, keywords: post.keywords };
}

function renderContent(content: string) {
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  const flushList = (key: string) => {
    if (list.length) {
      blocks.push(
        <ul key={key} className="list-disc pl-6 space-y-1 text-slate-700 leading-relaxed">
          {list.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
      list = [];
    }
  };
  content
    .split('\n')
    .map((l) => l.trim())
    .forEach((line, i) => {
      if (!line) {
        flushList(`ul-${i}`);
        return;
      }
      if (line.startsWith('## ')) {
        flushList(`ul-${i}`);
        blocks.push(
          <h2 key={i} className="text-2xl font-bold text-slate-900 pt-6">
            {line.replace(/^##\s+/, '')}
          </h2>
        );
        return;
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        list.push(line.replace(/^[-*]\s+/, ''));
        return;
      }
      flushList(`ul-${i}`);
      // Strip markdown bold markers for display.
      const text = line.replace(/\*\*([^*]+)\*\*/g, '$1');
      blocks.push(
        <p key={i} className="text-slate-700 leading-relaxed">
          {text}
        </p>
      );
    });
  flushList('ul-end');
  return blocks;
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <Breadcrumbs items={[{ label: 'Blog', href: '/blog' }, { label: post.title }]} />
      <Link href="/blog" className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:text-teal-800">
        <ArrowLeft className="w-4 h-4" /> Back to blog
      </Link>
      <header className="space-y-3">
        <span className="inline-block px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 text-xs font-semibold border border-teal-200">
          {post.category}
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">{post.title}</h1>
        <p className="text-sm text-slate-500 flex items-center gap-3">
          <span>
            {post.author.name} · {post.author.role}
          </span>
          <span>{post.publishedAt}</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> {post.readTime}
          </span>
        </p>
        <p className="text-slate-600 leading-relaxed">{post.excerpt}</p>
      </header>
      <article className="space-y-4">{renderContent(post.content)}</article>
      <div className="bg-teal-50 border border-teal-200 rounded-2xl p-6 space-y-2">
        <h2 className="font-bold text-slate-900">List your business on BizListPlace</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          Put the advice in this guide to work — a complete, verified listing is the first step.
        </p>
        <Link href="/add-business" className="inline-block text-sm font-semibold text-teal-700 hover:text-teal-800">
          Add your business →
        </Link>
      </div>
    </div>
  );
}
