'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Sparkles, Camera, PenTool, Gift, Award, Clock, ShieldCheck, 
  ChevronRight, ArrowRight, Heart, CheckCircle2, MessageSquare, 
  HelpCircle, ChevronDown, Check, ArrowLeft, Star, ShoppingBag, Eye
} from 'lucide-react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import ProductCard from '../../components/ProductCard';
import SafeImage from '../../components/SafeImage';
import Breadcrumbs from '../../components/Breadcrumbs';
import { useProducts } from '../../context/ProductContext';
import { PRODUCTS as fallbackProducts, Product } from '../../data/mockData';
import { useToast } from '../../components/Toast';
import { useCart } from '../../context/CartContext';

export default function PersonalisationPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { addToCart } = useCart();
  const { products } = useProducts();
  const PRODUCTS = products.length > 0 ? products : fallbackProducts;

  // Interactive Live Studio State
  const [previewText, setPreviewText] = useState('Happy Birthday Priya! ❤️');
  const [recipientName, setRecipientName] = useState('Priya');
  const [selectedStyle, setSelectedStyle] = useState<'gold' | 'rose' | 'classic'>('gold');
  const [selectedOccasion, setSelectedOccasion] = useState('Birthday');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Plaque Customizer Modal State
  const [isPlaqueModalOpen, setIsPlaqueModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('Custom Gifting Plaque');
  const [modalMessage, setModalMessage] = useState('Wishing you infinite joy, laughter, and success on your special day!');
  const [modalRecipient, setModalRecipient] = useState('Best Friend');

  // Filter personalized products from catalog
  const personalisedProducts = useMemo(() => {
    return PRODUCTS.filter(p => 
      p.id === 'cake-6' || 
      p.id === 'cake-1' || 
      p.id === 'cake-2' || 
      p.id === 'cake-4' ||
      p.category === 'cakes' ||
      p.category === 'gifts'
    ).slice(0, 8);
  }, [PRODUCTS]);

  const CATEGORY_CARDS = [
    {
      id: 'photo-cakes',
      badge: '📸 TOP PERSONALISATION',
      title: 'Custom Photo Print Cakes',
      subtitle: 'Edible Memories on Fresh Cake',
      desc: 'High-definition edible sugar sheet printing on fresh vanilla, red velvet, or Belgian chocolate cream cakes. Upload any cherished photo memory.',
      price: 'From ₹999',
      image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600&auto=format&fit=crop&q=80',
      highlights: ['100% Edible Sugar Sheet', 'Eggless Available', 'Within 12 hours Delivery'],
      targetUrl: '/product/cake-6',
      actionLabel: 'Personalise Now',
      isDirectProduct: true
    },
    {
      id: 'cake-messages',
      badge: '✍️ HANDWRITTEN WISHES',
      title: 'Bespoke Message & Calligraphy Cakes',
      subtitle: 'Artisanal Piped Lettering',
      desc: 'Hand-piped Belgian chocolate calligraphy, custom name plaques, and acrylic mirror gold toppers tailored for your celebratory milestone.',
      price: 'From ₹499',
      image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80',
      highlights: ['Free Custom Cake Message', 'Gold Mirror Topper Option', 'Fresh Baked On Order'],
      targetUrl: '/product/cake-1',
      actionLabel: 'Personalise Now',
      isDirectProduct: true
    },
    {
      id: 'gifting-plaques',
      badge: '🏆 LUXURY KEEPSAKE',
      title: 'Custom Gifting Plaques & Cards',
      subtitle: 'Gold-Foil Engraved Keepsakes',
      desc: 'Laser-finished golden metallic plaques and heavy-textured archival greeting cards printed with your heartfelt custom celebration letter.',
      price: 'From ₹299',
      image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600&auto=format&fit=crop&q=80',
      highlights: ['Gold-Foil Hot Stamping', 'Archival Keepsake Card', 'Included with Gift Combos'],
      targetUrl: '#plaque-studio',
      actionLabel: 'Customise Plaque',
      isDirectProduct: false
    },
    {
      id: 'custom-hampers',
      badge: '🎁 BESPOKE HAMPERS',
      title: 'Personalised Luxury Gift Hampers',
      subtitle: 'Curated Milestone Ensembles',
      desc: 'Luxury celebration hampers with personalized ribbon monogramming, customized chocolate truffle boxes, and floral bouquets.',
      price: 'From ₹1,499',
      image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600&auto=format&fit=crop&q=80',
      highlights: ['Custom Printed Ribbon', 'Artisanal Pralines & Flowers', 'Delivered within 12 hours'],
      targetUrl: '/gifts',
      actionLabel: 'Explore Hampers',
      isDirectProduct: true
    }
  ];

  const HOW_IT_WORKS_STEPS = [
    {
      step: '01',
      title: 'Choose Your Product',
      desc: 'Pick from our selection of artisanal photo cakes, celebration cakes, floral hampers, or custom plaques.',
      icon: ShoppingBag
    },
    {
      step: '02',
      title: 'Add Photo or Message',
      desc: 'Type your custom cake message, recipient name, or upload high-resolution photos during product selection.',
      icon: PenTool
    },
    {
      step: '03',
      title: 'Preview Your Customisation',
      desc: 'Review your personalized lettering, design finish, and select eggless / size options in real time.',
      icon: Eye
    },
    {
      step: '04',
      title: 'Handcrafted & Delivered',
      desc: 'Freshly prepared by master chefs and delivered safely to your doorstep within 12 hours.',
      icon: Clock
    }
  ];

  const TRUST_ITEMS = [
    {
      icon: PenTool,
      title: 'Easy Personalisation',
      desc: 'Intuitive text inputs and instant preview without complex design tools or delays.'
    },
    {
      icon: Award,
      title: 'Quality Printing',
      desc: '100% certified food-grade edible sugar sheets and archival quality gold-foil cards.'
    },
    {
      icon: ShieldCheck,
      title: 'Secure Checkout',
      desc: 'Encrypted UPI & card payments with live OTP verification upon doorstep delivery.'
    },
    {
      icon: Clock,
      title: 'Fast Delivery',
      desc: 'Freshly prepared on demand and delivered within 12 hours across city zones.'
    }
  ];

  const FAQS = [
    {
      q: 'How do I customize a photo cake with my own image?',
      a: 'Select the "Custom Photo Print Cake" from our catalogue. You can customize your cake flavor, eggless preference, and message on the product page. Our chef team will confirm your high-definition image directly upon ordering.'
    },
    {
      q: 'Can I write a custom message on any celebration cake?',
      a: 'Yes! Every cake on FATAFAT includes complimentary custom piping lettering (up to 30 characters). You can type your exact message directly on the product detail page before adding to cart.'
    },
    {
      q: 'Are the photo prints completely edible and food-safe?',
      a: 'Absolutely. We use 100% vegetarian, edible sugar sheets imported from certified confectionery producers, printed using food-grade natural edible colors that are completely safe and delicious.'
    },
    {
      q: 'How fast can a personalised photo cake be delivered?',
      a: 'All personalized photo cakes and custom message cakes are freshly prepared and delivered within 12 hours of placing your order.'
    }
  ];

  const handleCardAction = (card: typeof CATEGORY_CARDS[0]) => {
    if (card.isDirectProduct) {
      router.push(card.targetUrl);
    } else {
      setModalTitle(card.title);
      setIsPlaqueModalOpen(true);
    }
  };

  const handlePlaqueSave = () => {
    showToast(`Personalised plaque saved: "${modalMessage.slice(0, 30)}..."`, 'success');
    setIsPlaqueModalOpen(false);
    // Smooth scroll to personalized cake catalogue
    const element = document.getElementById('personalised-products');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-brand-charcoal font-sans text-xs select-none">
      <Header />

      <main className="flex-grow">
        {/* TOP BREADCRUMB & BACK STRIP */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4">
          <div className="flex items-center justify-between">
            <Breadcrumbs />
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1 text-[11px] font-bold text-zinc-500 hover:text-brand-burgundy transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
          </div>
        </div>

        {/* 1. HERO SECTION */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
          <div className="relative rounded-[32px] bg-gradient-to-br from-[#6B1D2F] via-[#501422] to-[#360C16] text-white p-8 sm:p-14 overflow-hidden shadow-2xl border border-brand-burgundy/20">
            {/* Ambient gold radial pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(#DFBA5E_0.75px,transparent_0.75px)] [background-size:20px_20px] opacity-20 pointer-events-none" />
            <div className="absolute top-0 right-0 w-96 h-96 bg-brand-gold/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 max-w-2xl space-y-4 text-center sm:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-brand-gold text-[9px] font-black uppercase tracking-[0.25em]">
                <Sparkles className="h-3 w-3 text-brand-gold animate-pulse" />
                <span>BESPOKE GIFTING STUDIO • FATAFAT CRAFTS</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-serif font-black tracking-tight leading-tight">
                Make It Personal. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-gold via-amber-200 to-brand-gold-light">
                  Photo Cakes & Custom Gifting
                </span>
              </h1>

              <p className="text-xs sm:text-sm text-zinc-200 font-medium leading-relaxed max-w-xl">
                Add cherished memories, custom gold-foil messages, and bespoke names to make every anniversary, birthday, and celebration truly unforgettable. Handcrafted fresh with pure passion.
              </p>

              {/* Action Buttons */}
              <div className="pt-3 flex flex-wrap items-center justify-center sm:justify-start gap-3">
                <a
                  href="#category-cards"
                  className="px-7 py-3.5 rounded-full bg-brand-gold hover:bg-brand-gold-light text-zinc-950 font-serif font-bold text-xs uppercase tracking-wider shadow-lg transition-all transform active:scale-95 flex items-center gap-2"
                >
                  <span>Start Personalising</span>
                  <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
                </a>

                <Link
                  href="/product/cake-6"
                  className="px-6 py-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-serif font-bold text-xs uppercase tracking-wider border border-white/20 backdrop-blur-md transition-all flex items-center gap-2"
                >
                  <Camera className="h-3.5 w-3.5 text-brand-gold" />
                  <span>Custom Photo Cake</span>
                </Link>
              </div>

              {/* Trust Badges Bar */}
              <div className="pt-6 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
                <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-200">
                  <CheckCircle2 className="h-3.5 w-3.5 text-brand-gold shrink-0" />
                  <span>Within 12 hours Delivery</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-200">
                  <CheckCircle2 className="h-3.5 w-3.5 text-brand-gold shrink-0" />
                  <span>Food-Safe Edible Print</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-200">
                  <CheckCircle2 className="h-3.5 w-3.5 text-brand-gold shrink-0" />
                  <span>Free Cake Message</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-200">
                  <CheckCircle2 className="h-3.5 w-3.5 text-brand-gold shrink-0" />
                  <span>100% Quality Guaranteed</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. CATEGORY CARDS SECTION */}
        <section id="category-cards" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="text-center space-y-1.5 mb-10">
            <span className="text-[9px] text-brand-burgundy font-extrabold uppercase tracking-[0.25em] block">
              EXPLORE PERSONALISATION CATEGORIES
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-black text-brand-charcoal">
              Choose How You Want to Personalise
            </h2>
            <p className="text-xs text-zinc-500 max-w-md mx-auto">
              From edible photo cakes to engraved golden plaques, select your canvas below.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {CATEGORY_CARDS.map((card) => (
              <div
                key={card.id}
                className="bg-white rounded-3xl border border-zinc-200/40 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group"
              >
                {/* Visual Area */}
                <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-zinc-100">
                  <SafeImage
                    src={card.image}
                    alt={card.title}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 bg-brand-burgundy/90 backdrop-blur-md text-white px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-wider shadow">
                    {card.badge}
                  </div>
                  <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-md text-brand-burgundy px-2.5 py-1 rounded-full text-[9px] font-black shadow border border-zinc-200/20">
                    {card.price}
                  </div>
                </div>

                {/* Content Area */}
                <div className="p-5 flex flex-col flex-grow justify-between space-y-4">
                  <div className="space-y-2">
                    <h3 className="font-serif font-bold text-base text-zinc-900 leading-snug group-hover:text-brand-burgundy transition-colors">
                      {card.title}
                    </h3>
                    <p className="text-[11px] text-zinc-500 leading-relaxed line-clamp-3">
                      {card.desc}
                    </p>

                    {/* Highlights */}
                    <div className="pt-2 space-y-1">
                      {card.highlights.map((h, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-600">
                          <Check className="h-3 w-3 text-emerald-600 shrink-0" />
                          <span>{h}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => handleCardAction(card)}
                    className="w-full py-3 rounded-2xl bg-brand-burgundy hover:bg-brand-burgundy-dark text-white font-serif font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 group-hover:bg-brand-gold group-hover:text-zinc-950"
                  >
                    <span>{card.actionLabel}</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 3. INTERACTIVE LIVE PLAQUE & MESSAGE STUDIO */}
        <section id="plaque-studio" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="rounded-3xl bg-gradient-to-br from-brand-blush/80 via-white to-amber-50/50 p-6 sm:p-10 border border-zinc-200/30 shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Studio Controls */}
              <div className="lg:col-span-6 space-y-5">
                <div className="space-y-1">
                  <span className="text-[9px] text-brand-burgundy font-extrabold uppercase tracking-[0.25em] block">
                    INTERACTIVE STUDIO 🎨
                  </span>
                  <h3 className="text-xl sm:text-2xl font-serif font-black text-brand-charcoal">
                    Live Plaque & Message Preview
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Type your personalized message below to see how our master calligraphers and laser engravers will render it.
                  </p>
                </div>

                {/* Recipient Name Input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-600">
                    Recipient Name / Title
                  </label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="e.g. Priya, Mom & Dad, Rohan"
                    maxLength={25}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-250 bg-white text-xs font-bold text-zinc-800 outline-none focus:border-brand-burgundy transition-all"
                  />
                </div>

                {/* Custom Message Textarea */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-600">
                    Celebration Message
                  </label>
                  <textarea
                    value={previewText}
                    onChange={(e) => setPreviewText(e.target.value)}
                    rows={3}
                    maxLength={100}
                    placeholder="Enter your heartfelt message..."
                    className="w-full p-3 rounded-xl border border-zinc-250 bg-white text-xs font-medium text-zinc-800 outline-none focus:border-brand-burgundy transition-all resize-none"
                  />
                  <div className="flex justify-between text-[9px] text-zinc-400 font-medium">
                    <span>Complimentary with custom orders</span>
                    <span>{previewText.length}/100</span>
                  </div>
                </div>

                {/* Plaque Finish Selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-600">
                    Plaque Foil Finish
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'gold', label: 'Golden Metallic' },
                      { id: 'rose', label: 'Rose Gold Foil' },
                      { id: 'classic', label: 'Classic Velvet' }
                    ].map((style) => (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => setSelectedStyle(style.id as any)}
                        className={`py-2 px-3 rounded-xl border text-[10px] font-bold uppercase transition-all ${
                          selectedStyle === style.id 
                            ? 'bg-brand-burgundy text-white border-brand-burgundy shadow-sm' 
                            : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
                        }`}
                      >
                        {style.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    href="/product/cake-6"
                    className="w-full py-3 rounded-2xl bg-brand-gold hover:bg-brand-gold-light text-zinc-950 font-serif font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <span>Apply to Photo Cake Order</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              {/* Live Preview Display Card */}
              <div className="lg:col-span-6 flex justify-center">
                <div className={`w-full max-w-md rounded-3xl p-8 border shadow-xl relative overflow-hidden transition-all duration-300 ${
                  selectedStyle === 'gold' 
                    ? 'bg-gradient-to-br from-[#2D1B00] via-[#4A320A] to-[#1F1200] border-amber-500/40 text-amber-100' 
                    : selectedStyle === 'rose'
                    ? 'bg-gradient-to-br from-[#3D141E] via-[#5C2330] to-[#2B0E15] border-rose-400/40 text-rose-100'
                    : 'bg-gradient-to-br from-[#18181B] via-[#27272A] to-[#09090B] border-zinc-600/40 text-zinc-100'
                }`}>
                  {/* Subtle Plaque Frame border */}
                  <div className="border border-brand-gold/30 rounded-2xl p-6 relative z-10 flex flex-col items-center text-center space-y-4 min-h-[260px] justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-brand-gold" />
                      <span className="text-[8px] font-serif font-black tracking-[0.3em] uppercase text-brand-gold">
                        FATAFAT BESPOKE ENGRAVING
                      </span>
                      <Sparkles className="h-4 w-4 text-brand-gold" />
                    </div>

                    <div className="space-y-2 my-auto">
                      <h4 className="font-serif font-black text-lg sm:text-xl tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-brand-gold-light to-amber-200">
                        {recipientName ? `Dearest ${recipientName}` : 'Dearest Recipient'}
                      </h4>
                      <p className="font-serif italic text-xs sm:text-sm leading-relaxed px-2 text-zinc-200/90">
                        &ldquo;{previewText || 'Your customized celebration message will be engraved here beautifully.'}&rdquo;
                      </p>
                    </div>

                    <div className="pt-2 border-t border-brand-gold/20 w-full flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-brand-gold/80">
                      <span>Verified Artisanal Craft</span>
                      <span>Handcrafted with Love</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. HOW IT WORKS SECTION */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 border-t border-zinc-200/20">
          <div className="text-center space-y-1.5 mb-10">
            <span className="text-[9px] text-brand-burgundy font-extrabold uppercase tracking-[0.25em] block">
              SEAMLESS 4-STEP PROCESS
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-black text-brand-charcoal">
              How Personalisation Works
            </h2>
            <p className="text-xs text-zinc-500 max-w-md mx-auto">
              Creating unforgettable personalized gifts is quick, reliable, and effortless.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS_STEPS.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.step}
                  className="bg-white rounded-3xl p-6 border border-zinc-200/30 shadow-sm relative flex flex-col justify-between space-y-4"
                >
                  <div className="flex justify-between items-start">
                    <div className="h-12 w-12 rounded-2xl bg-brand-burgundy/5 text-brand-burgundy flex items-center justify-center">
                      <Icon className="h-6 w-6 stroke-[1.5]" />
                    </div>
                    <span className="text-2xl font-serif font-black text-zinc-200">
                      {step.step}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-serif font-bold text-sm text-zinc-900">
                      {step.title}
                    </h4>
                    <p className="text-[11px] text-zinc-500 leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 5. POPULAR PERSONALISABLE PRODUCTS CATALOGUE */}
        <section id="personalised-products" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 mb-8">
            <div className="space-y-1 text-left">
              <span className="text-[9px] text-brand-burgundy font-extrabold uppercase tracking-[0.25em] block">
                READY TO CUSTOMISE
              </span>
              <h2 className="text-2xl sm:text-3xl font-serif font-black text-brand-charcoal">
                Popular Personalised Bestsellers
              </h2>
              <p className="text-xs text-zinc-500">
                Choose any item below to add your custom photo print or engraved cake message.
              </p>
            </div>
            <Link
              href="/cakes"
              className="text-xs font-bold text-brand-burgundy hover:underline flex items-center gap-1 shrink-0"
            >
              View All Cakes <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4">
            {personalisedProducts.map((prod) => (
              <ProductCard key={prod.id} product={prod} />
            ))}
          </div>
        </section>

        {/* 6. TRUST & QUALITY SECTION */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 border-t border-zinc-200/20">
          <div className="bg-brand-blush/60 rounded-3xl p-8 border border-zinc-200/20">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-center">
              {TRUST_ITEMS.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div key={idx} className="flex flex-col items-center gap-2 p-2">
                    <div className="h-12 w-12 rounded-full bg-white shadow-sm border border-zinc-200/20 text-brand-burgundy flex items-center justify-center">
                      <Icon className="h-5 w-5 stroke-[2]" />
                    </div>
                    <h5 className="font-serif font-bold text-xs text-zinc-900">
                      {item.title}
                    </h5>
                    <p className="text-[10px] text-zinc-500 max-w-xs leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 7. FAQS ACCORDION */}
        <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="text-center space-y-1.5 mb-8">
            <span className="text-[9px] text-brand-burgundy font-extrabold uppercase tracking-[0.25em] block">
              FREQUENTLY ASKED QUESTIONS
            </span>
            <h2 className="text-xl sm:text-2xl font-serif font-black text-brand-charcoal">
              Personalisation Queries Answered
            </h2>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-zinc-200/40 overflow-hidden shadow-sm text-left transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-4 flex justify-between items-center gap-3 text-left font-bold text-xs text-zinc-900 hover:text-brand-burgundy transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`h-4 w-4 text-zinc-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-brand-burgundy' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 text-[11px] text-zinc-500 leading-relaxed border-t border-zinc-100">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* PLAQUE / CUSTOMISATION MODAL DIALOG */}
      {isPlaqueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md space-y-5 text-left border shadow-2xl relative">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h4 className="font-serif font-black text-base text-brand-burgundy">
                  {modalTitle}
                </h4>
                <p className="text-[10px] text-zinc-400 font-medium">Configure your custom celebration message</p>
              </div>
              <button
                onClick={() => setIsPlaqueModalOpen(false)}
                className="p-1 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-600">
                  Recipient Name
                </label>
                <input
                  type="text"
                  value={modalRecipient}
                  onChange={(e) => setModalRecipient(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border text-xs font-bold text-zinc-800 outline-none focus:border-brand-burgundy"
                  placeholder="e.g. Best Friend, Mom & Dad"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-600">
                  Custom Plaque Lettering
                </label>
                <textarea
                  value={modalMessage}
                  onChange={(e) => setModalMessage(e.target.value)}
                  rows={3}
                  maxLength={120}
                  className="w-full p-3 rounded-xl border text-xs font-medium text-zinc-800 outline-none focus:border-brand-burgundy resize-none"
                  placeholder="Enter message for plaque..."
                />
              </div>

              {/* Plaque Preview Box */}
              <div className="bg-gradient-to-br from-[#2D1B00] to-[#1F1200] border border-amber-500/30 text-amber-100 p-4 rounded-2xl text-center space-y-1">
                <span className="text-[8px] font-mono text-brand-gold uppercase tracking-widest block">Preview</span>
                <p className="font-serif italic text-xs">&ldquo;{modalMessage}&rdquo;</p>
                <span className="text-[9px] font-bold text-amber-300 block">- For {modalRecipient}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsPlaqueModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border text-zinc-600 font-bold text-xs hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePlaqueSave}
                className="flex-1 py-2.5 rounded-xl bg-brand-burgundy hover:bg-brand-burgundy-dark text-white font-bold text-xs uppercase tracking-wider shadow"
              >
                Save & Continue
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
