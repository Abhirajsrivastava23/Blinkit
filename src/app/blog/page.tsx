'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar, User, ArrowRight } from 'lucide-react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Breadcrumbs from '../../components/Breadcrumbs';

const BLOG_POSTS = [
  {
    slug: 'perfect-floral-guide',
    title: 'The Art of Floral Gifting: Matching Blooms to Occasions',
    excerpt: 'Flowers speak a language of their own. Learn how to choose the perfect bouquet based on floral symbolisms and color psychology.',
    date: 'August 18, 2026',
    author: 'Elena Vance',
    image: 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?w=500&auto=format&fit=crop&q=80'
  },
  {
    slug: 'chocolate-gourmet-secrets',
    title: 'Secrets Behind Artisanal Single-Origin Chocolates',
    excerpt: 'What makes gourmet chocolate feel so premium? We dive deep into the bean-to-bar refining process and the tasting notes of cacao.',
    date: 'August 14, 2026',
    author: 'Chef Marc Andre',
    image: 'https://images.unsplash.com/photo-1511381939415-e44015466834?w=500&auto=format&fit=crop&q=80'
  },
  {
    slug: 'baking-perfect-bento',
    title: 'Bento Cakes: The Micro-Celebration Trend Taking Over',
    excerpt: 'Explore why single-serve bento cakes have become the absolute favorite dessert choice for quick modern celebrations.',
    date: 'August 10, 2026',
    author: 'Pastry Chef Risha',
    image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500&auto=format&fit=crop&q=80'
  }
];

export default function BlogPage() {
  return (
    <>
      <Header />
      <main className="flex-grow bg-[#FAF9F6] py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-8">
          
          <Breadcrumbs />

          {/* Hero */}
          <div className="text-center py-6 space-y-2 max-w-xl mx-auto">
            <h1 className="text-3xl font-serif font-extrabold text-zinc-800">
              The FATAFAT Gazette
            </h1>
            <p className="text-xs text-zinc-500">
              Gourmet dessert recipes, floral maintenance guidelines, and thoughtful celebration inspirations.
            </p>
          </div>

          {/* Blog grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {BLOG_POSTS.map((post) => (
              <div key={post.slug} className="bg-white border rounded-3xl overflow-hidden shadow-sm flex flex-col justify-between hover:border-brand-burgundy/10 transition-colors">
                <div>
                  <div className="relative h-44 w-full overflow-hidden">
                    <img
                      src={post.image}
                      alt={post.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                    />
                  </div>
                  
                  <div className="p-5 space-y-3">
                    <div className="flex gap-4 text-[9px] text-zinc-400 font-bold uppercase tracking-wider">
                      <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {post.date}</span>
                      <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> {post.author}</span>
                    </div>
                    <h3 className="text-xs sm:text-sm font-serif font-extrabold text-zinc-800 line-clamp-2 leading-relaxed">
                      {post.title}
                    </h3>
                    <p className="text-[11px] text-zinc-500 leading-relaxed line-clamp-3">
                      {post.excerpt}
                    </p>
                  </div>
                </div>

                <div className="p-5 pt-0">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="text-xs text-brand-burgundy font-bold hover:underline flex items-center gap-1 group"
                  >
                    Read Article <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

        </div>
      </main>
      <Footer />
    </>
  );
}
