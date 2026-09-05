'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Calendar, User, ArrowLeft, Clock } from 'lucide-react';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import Breadcrumbs from '../../../components/Breadcrumbs';
import SafeImage from '../../../components/SafeImage';

const BLOG_POSTS = [
  {
    slug: 'perfect-floral-guide',
    title: 'The Art of Floral Gifting: Matching Blooms to Occasions',
    content: `
      Flowers speak a language of their own. For centuries, across civilizations, sending a bouquet has been one of the most expressive gestures of human care. However, matching the exact species of blooms and color coordinates to specific life moments can be an art form.

      In this guide, we dive deep into the symbolism of roses, lilies, carnations, and matching seasonal flora, to ensure your acts of care are perfectly aligned with recipient sentiment.

      ### 1. The Red Rose: Romantic Love & Passion
      It is no surprise that red roses represent romance. But did you know that the count of stems carries messaging too? A single red rose conveys "love at first sight," while a dozen roses represents standard romantic commitment.

      ### 2. Lilies: Elegance and Gratitude
      White lilies represent pure intention and respect. They are highly popular choices for mother's day, sympathy actions, and house-warming gifts. Pink Stargazer lilies add an element of wealth, ambition, and celebratory congratulations.

      ### 3. Sunflowers: Joy and Resilience
      Bright yellow sunflowers bring instant smiles. They represent loyalty, warmth, longevity, and recovery. They make outstanding "Get Well Soon" floral hampers.
    `,
    date: 'August 18, 2026',
    author: 'Elena Vance',
    image: 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?w=800&auto=format&fit=crop&q=80'
  },
  {
    slug: 'chocolate-gourmet-secrets',
    title: 'Secrets Behind Artisanal Single-Origin Chocolates',
    content: `
      Gourmet chocolate is more than just candy—it is a culinary science. Much like fine wine, high-quality dark chocolate carries distinct flavor notes depending on the geography, soil, and cacao variety.

      ### Cacao Terroir
      Cacao beans harvested from Madagascar often carry sweet, fruity, raspberry notes, whereas beans from Ecuador tend to showcase heavy, earthy, floral tones. At FATAFAT, we source single-origin chocolate bars that showcase these nuances.

      ### The Refining Craft
      Artisanal chocolate undergoes careful "conching"—a process of continuous mixing and aeration under low heat—which develops the smooth texture and eliminates volatile acidity, letting the rich cocoa bean oils stand out.
    `,
    date: 'August 14, 2026',
    author: 'Chef Marc Andre',
    image: 'https://images.unsplash.com/photo-1511381939415-e44015466834?w=800&auto=format&fit=crop&q=80'
  },
  {
    slug: 'baking-perfect-bento',
    title: 'Bento Cakes: The Micro-Celebration Trend Taking Over',
    content: `
      Single-serve bento cakes have taken the celebration world by storm. Originating in South Korea, these 4-inch cakes fit snugly in a lunchbox, designed for intimate moments, small milestones, or just because.

      ### Why Bento Cakes?
      - **Intimate Portions**: Zero cake waste. Perfect for 1-2 people.
      - **Custom Sayings**: Clean typography canvas to write silly, romantic, or direct text messages.
      - **Aesthetic Charm**: Pastel color combinations and rustic hand-piped frosting borders.
    `,
    date: 'August 10, 2026',
    author: 'Pastry Chef Risha',
    image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&auto=format&fit=crop&q=80'
  }
];

export default function BlogDetailPage() {
  const params = useParams();
  const router = useRouter();

  const slug = params.slug as string;
  const [post, setPost] = useState<typeof BLOG_POSTS[0] | undefined>(undefined);

  useEffect(() => {
    const found = BLOG_POSTS.find((p) => p.slug === slug);
    setPost(found);
  }, [slug]);

  if (!post) {
    return (
      <>
        <Header />
        <div className="flex-1 bg-[#FAF9F6] flex flex-col items-center justify-center p-8 text-center py-20">
          <h2 className="text-xl font-bold font-serif">Article not found</h2>
          <button
            onClick={() => router.push('/blog')}
            className="mt-6 px-6 py-2.5 rounded-full bg-brand-burgundy text-white text-xs font-bold uppercase tracking-wider"
          >
            Return to Blog
          </button>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="flex-grow bg-[#FAF9F6] py-12">
        <div className="mx-auto max-w-3xl px-4 space-y-6">
          
          <Breadcrumbs />

          <button
            onClick={() => router.push('/blog')}
            className="text-xs text-brand-burgundy font-bold hover:underline flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Gazette
          </button>

          <div className="space-y-4">
            <h1 className="text-2xl sm:text-4xl font-serif font-extrabold text-zinc-800 leading-tight">
              {post.title}
            </h1>
            
            <div className="flex gap-4 text-[10px] text-zinc-400 font-bold uppercase tracking-wider border-b pb-4">
              <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {post.date}</span>
              <span className="flex items-center gap-1"><User className="h-4 w-4" /> By {post.author}</span>
              <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> 4 min read</span>
            </div>
          </div>

          <div className="relative h-64 sm:h-96 w-full rounded-3xl overflow-hidden shadow">
            <SafeImage 
              src={post.image} 
              alt={post.title} 
              category="celebrations"
              className="w-full h-full object-cover" 
            />
          </div>

          {/* Article Content */}
          <article className="prose max-w-none text-xs sm:text-sm text-zinc-700 leading-relaxed space-y-6 pt-4 whitespace-pre-line">
            {post.content}
          </article>

        </div>
      </main>
      <Footer />
    </>
  );
}
