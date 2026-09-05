'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '../../../../components/Header';
import Footer from '../../../../components/Footer';
import ProductCard from '../../../../components/ProductCard';
import SafeImage from '../../../../components/SafeImage';
import { useAuth } from '../../../../context/AuthContext';
import { useCart } from '../../../../context/CartContext';
import { useWishlist } from '../../../../context/WishlistContext';
import { useToast } from '../../../../components/Toast';
import { PRODUCTS as fallbackProducts, Product } from '../../../../data/mockData';
import { Star, Truck, Heart, ShoppingBag, EyeOff, ArrowLeft } from 'lucide-react';
import { useProducts } from '../../../../context/ProductContext';

export default function WellnessProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading, wellnessPublished } = useAuth();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { showToast } = useToast();
  const { products } = useProducts();
  const PRODUCTS = products.length > 0 ? products : fallbackProducts;

  useEffect(() => {
    if (!isLoading) {
      if (!wellnessPublished && user?.role !== 'admin') {
        router.push('/');
        return;
      }
      if (user?.wellnessAccessStatus !== 'ACTIVE' && user?.role !== 'admin') {
        router.push('/wellness');
      }
    }
  }, [user, isLoading, wellnessPublished, router]);

  const slug = params.slug as string;
  const product = useMemo(
    () => PRODUCTS.find(
      (p) => p.category === 'wellness' && p.wellnessVerified && (p.id === slug || p.name.toLowerCase().replace(/ /g, '-') === slug)
    ),
    [PRODUCTS, slug]
  );
  const [selectedVariant, setSelectedVariant] = useState<string>('');
  const [activeImage, setActiveImage] = useState<string>('');
  const [imageError, setImageError] = useState(false);

  const currentVariant = product?.variants?.includes(selectedVariant)
    ? selectedVariant
    : product?.variants?.[0] ?? '';
  const previewImage = activeImage || product?.image || '';

  if (!isLoading && !wellnessPublished && user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-brand-charcoal select-none font-sans text-xs">
        <Header />
        <div className="flex-grow flex flex-col items-center justify-center p-8 text-center py-24 space-y-4">
          <div className="h-16 w-16 bg-zinc-100 text-zinc-400 rounded-full flex items-center justify-center mx-auto">
            <EyeOff className="h-8 w-8 text-zinc-400" />
          </div>
          <h2 className="text-2xl font-serif font-black text-zinc-900 uppercase tracking-wide">404 - Product Unavailable</h2>
          <p className="text-xs text-zinc-500 max-w-sm font-medium leading-relaxed">
            The requested wellness item is currently offline or unpublished.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-brand-burgundy hover:bg-brand-burgundy-dark text-white rounded-xl text-xs font-serif font-bold uppercase tracking-wider transition-all"
          >
            Return to Store
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  if (isLoading || (user?.wellnessAccessStatus !== 'ACTIVE' && user?.role !== 'admin')) {
    return (
      <div className="min-h-screen bg-[#0B0B0E] flex items-center justify-center text-white text-xs">
        Verifying Wellness security token...
      </div>
    );
  }



  if (!product) {
    return (
      <div className="min-h-screen flex flex-col bg-[#0B0B0E] text-zinc-300">
        <Header />
        <div className="flex-grow flex flex-col items-center justify-center p-8 text-center py-20">
          <h2 className="text-xl font-bold font-serif text-white">Wellness product not found</h2>
          <button
            onClick={() => router.push('/wellness')}
            className="mt-6 px-6 py-2.5 rounded-full bg-wellness-bronze text-zinc-950 text-xs font-bold uppercase tracking-wider"
          >
            Back to Wellness
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  const handleAddToCart = () => {
    addToCart(product, 1, {
      size: currentVariant || undefined
    });
    showToast(`${product.name} added to cart!`, 'success');
  };

  const handleAddToWishlist = () => {
    toggleWishlist(product.id);
    showToast(isInWishlist(product.id) ? 'Removed from favorites' : 'Added to favorites', 'info');
  };

  // Frequently Bought Together logic: Bundle with another verified wellness product
  const bundleProduct = PRODUCTS.find((p) => p.category === 'wellness' && p.id !== product.id && p.wellnessVerified);

  // Related products (other wellness products from same brand or category)
  const relatedProducts = PRODUCTS
    .filter((p) => p.category === 'wellness' && p.id !== product.id && p.wellnessVerified)
    .slice(0, 3);

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0B0E] text-zinc-300">
      <Header />
      
      <main className="flex-grow py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-12">
          
          {/* Back button */}
          <button
            onClick={() => router.push('/wellness')}
            className="text-[10px] text-wellness-bronze hover:underline flex items-center gap-1 mb-2 font-bold uppercase tracking-wider"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Wellness Store
          </button>

          {/* Details split */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-start">
            
            {/* Left: Product Images Gallery */}
            <div className="md:col-span-6 space-y-4">
              <div className="relative aspect-square w-full rounded-3xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-lg flex items-center justify-center">
                <SafeImage 
                  src={previewImage} 
                  alt={product.name} 
                  category="wellness"
                  className="w-full h-full object-cover" 
                />
                
                {/* Floating Discreet tag */}
                <span className="absolute top-4 left-4 text-[8px] font-extrabold uppercase tracking-widest bg-zinc-900/90 text-wellness-bronze px-2.5 py-1 rounded-full border border-wellness-bronze/20 shadow-md">
                  Discreet Packing
                </span>
              </div>

              {/* Thumbnails */}
              {product.gallery && product.gallery.length > 1 && (
                <div className="flex gap-2">
                  {product.gallery.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setActiveImage(img);
                        setImageError(false);
                      }}
                      className={`h-16 w-16 rounded-xl overflow-hidden border transition-all ${
                        activeImage === img ? 'border-wellness-bronze bg-wellness-bronze/5' : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900'
                      }`}
                    >
                      <SafeImage src={img} alt={`Thumbnail ${idx}`} category="wellness" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Info details */}
            <div className="md:col-span-6 space-y-6 text-xs">
              
              <div className="space-y-2">
                <span className="text-[9px] text-brand-gold font-extrabold uppercase tracking-widest">
                  {product.wellnessBrand} • {product.wellnessType}
                </span>
                <h1 className="text-2xl sm:text-3xl font-serif font-extrabold text-white leading-tight">
                  {product.name}
                </h1>
                
                {/* Single star rating index */}
                <div className="flex items-center gap-1.5 text-zinc-450">
                  <Star className="h-4.5 w-4.5 fill-wellness-bronze text-wellness-bronze" />
                  <span className="font-extrabold text-white">{product.rating}</span>
                  <span>({product.reviewCount} verified ratings)</span>
                </div>
              </div>

              {/* Pricing */}
              <div className="flex items-baseline gap-3">
                <span className="text-2xl font-extrabold text-wellness-bronze">₹{product.price}</span>
                {product.discount > 0 && (
                  <>
                    <span className="text-xs text-zinc-500 line-through">₹{product.originalPrice}</span>
                    <span className="text-[10px] bg-wellness-bronze text-zinc-950 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {product.discount}% OFF
                    </span>
                  </>
                )}
              </div>

              {/* Delivery Speed */}
              <div className="flex items-center gap-2 p-3 bg-zinc-950 border border-zinc-850 rounded-xl w-fit font-bold uppercase tracking-wider text-[9px] text-wellness-bronze-light">
                <Truck className="h-4.5 w-4.5" /> Delivered in {product.deliveryTime} (Discreetly Packaged)
              </div>

              {/* Description */}
              <p className="text-zinc-400 leading-relaxed border-t border-b border-zinc-800 py-4 font-medium">
                {product.description}
              </p>

              {/* Pack Variant Selector */}
              {product.variants && product.variants.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest">Select Pack Size</span>
                  <div className="flex gap-2">
                    {product.variants.map((v) => (
                      <button
                        key={v}
                        onClick={() => setSelectedVariant(v)}
                        className={`px-4 py-2 border rounded-xl font-bold transition-all ${
                          currentVariant === v
                            ? 'border-wellness-bronze text-wellness-bronze bg-wellness-bronze/5'
                            : 'border-zinc-800 hover:border-zinc-700 text-zinc-400 bg-zinc-900'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Add to Cart Actions */}
              <div className="flex gap-4">
                <button
                  onClick={handleAddToCart}
                  className="flex-grow py-3.5 bg-wellness-bronze hover:bg-wellness-bronze-light text-zinc-950 font-serif font-extrabold text-xs uppercase tracking-widest rounded-full transition-all flex items-center justify-center gap-1.5 shadow-lg"
                >
                  <ShoppingBag className="h-4.5 w-4.5" /> Add to Cart
                </button>
                <button
                  onClick={handleAddToWishlist}
                  className={`p-3.5 border rounded-full transition-all ${
                    isInWishlist(product.id)
                      ? 'border-red-500 text-red-500 bg-red-500/5'
                      : 'border-zinc-850 text-zinc-500 hover:text-white bg-zinc-900'
                  }`}
                >
                  <Heart className="h-4.5 w-4.5" fill={isInWishlist(product.id) ? 'currentColor' : 'none'} />
                </button>
              </div>

              {/* Discreet shipping promise card */}
              <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-2xl flex gap-3.5 items-start">
                <EyeOff className="h-6 w-6 text-wellness-bronze shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-white uppercase tracking-wider">Confidential Double-Sealed Packaging</h4>
                  <p className="text-[10px] text-zinc-400 leading-relaxed font-medium">
                    Shipped in anonymous heavy cardboard box packaging with generic sender labeling. Zero items lists, invoice sheets, or descriptions on the outside.
                  </p>
                </div>
              </div>

            </div>

          </div>

          {/* Technical Specifications */}
          <div className="space-y-4 border-t border-zinc-800 pt-8">
            <h3 className="text-base font-serif font-extrabold text-white">Product Specifications</h3>
            <div className="bg-zinc-950 border border-zinc-850 rounded-2xl overflow-hidden text-xs">
              <table className="w-full text-left border-collapse">
                <tbody>
                  <tr className="border-b border-zinc-850">
                    <td className="p-3.5 font-bold text-zinc-500 w-1/3">Brand</td>
                    <td className="p-3.5 text-white">{product.wellnessBrand}</td>
                  </tr>
                  <tr className="border-b border-zinc-850">
                    <td className="p-3.5 font-bold text-zinc-500">Material</td>
                    <td className="p-3.5 text-white">{product.wellnessDetails?.material || product.wellnessMaterial}</td>
                  </tr>
                  <tr className="border-b border-zinc-850">
                    <td className="p-3.5 font-bold text-zinc-500">Lubrication</td>
                    <td className="p-3.5 text-white">{product.wellnessDetails?.lubrication || product.wellnessLubrication || 'Standard Lubrication'}</td>
                  </tr>
                  <tr className="border-b border-zinc-850">
                    <td className="p-3.5 font-bold text-zinc-500">Texture</td>
                    <td className="p-3.5 text-white">{product.wellnessDetails?.texture || product.wellnessTexture || 'Smooth'}</td>
                  </tr>
                  {product.wellnessDetails?.sizeFit && (
                    <tr className="border-b border-zinc-850">
                      <td className="p-3.5 font-bold text-zinc-500">Size & Fit</td>
                      <td className="p-3.5 text-white">{product.wellnessDetails.sizeFit}</td>
                    </tr>
                  )}
                  {product.wellnessFlavor && (
                    <tr className="border-b border-zinc-850">
                      <td className="p-3.5 font-bold text-zinc-500">Flavor Profile</td>
                      <td className="p-3.5 text-white">{product.wellnessFlavor}</td>
                    </tr>
                  )}
                  <tr className="border-b border-zinc-850">
                    <td className="p-3.5 font-bold text-zinc-500">SKU Code</td>
                    <td className="p-3.5 text-white font-mono text-[10px]">{product.wellnessSku || product.id.toUpperCase()}</td>
                  </tr>
                  <tr className="border-b border-zinc-850">
                    <td className="p-3.5 font-bold text-zinc-500">Storage Instructions</td>
                    <td className="p-3.5 text-white">{product.wellnessDetails?.storage || product.storageInstructions}</td>
                  </tr>
                  <tr>
                    <td className="p-3.5 font-bold text-zinc-500">Manufacturer</td>
                    <td className="p-3.5 text-white">{product.wellnessDetails?.manufacturer || 'Authorized Distributor'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Frequently Bought Together */}
          {bundleProduct && (
            <div className="space-y-4 border-t border-zinc-800 pt-8">
              <h3 className="text-base font-serif font-extrabold text-white">Frequently Bought Together</h3>
              <div className="p-5 bg-wellness-dark border border-wellness-bronze/15 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex flex-col sm:flex-row items-center gap-4 text-xs">
                  {/* Current product thumbnail */}
                  <div className="flex items-center gap-2">
                    <SafeImage src={product.image} alt={product.name} category="wellness" className="h-14 w-14 object-cover rounded-xl border border-zinc-850" />
                    <div>
                      <p className="font-bold text-white truncate max-w-[150px]">{product.name}</p>
                      <p className="text-wellness-bronze font-extrabold">₹{product.price}</p>
                    </div>
                  </div>
                  <span className="text-zinc-500 font-bold text-sm select-none shrink-0">+</span>
                  {/* Bundle Product thumbnail */}
                  <Link href={`/wellness/product/${bundleProduct.id}`} className="flex items-center gap-2 group text-left">
                    <SafeImage src={bundleProduct.image} alt={bundleProduct.name} category="wellness" className="h-14 w-14 object-cover rounded-xl border border-zinc-850 group-hover:border-wellness-bronze transition-colors" />
                    <div>
                      <p className="font-bold text-white group-hover:text-wellness-bronze transition-colors truncate max-w-[150px]">{bundleProduct.name}</p>
                      <p className="text-wellness-bronze font-extrabold">₹{bundleProduct.price}</p>
                    </div>
                  </Link>
                </div>

                <div className="flex flex-col items-center sm:items-end gap-2 text-xs">
                  <p className="text-[10px] text-zinc-550 font-bold">Bundle Price: <span className="text-white font-extrabold text-sm">₹{product.price + bundleProduct.price}</span></p>
                  <button
                    onClick={() => {
                      addToCart(product, 1);
                      addToCart(bundleProduct, 1);
                      showToast('Both items added to your cart!', 'success');
                    }}
                    className="px-6 py-2 bg-brand-gold text-zinc-950 hover:bg-brand-gold-light font-bold uppercase tracking-wider rounded-xl transition-colors text-[10px]"
                  >
                    Add Both to Cart
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Related Products */}
          <div className="space-y-4 border-t border-zinc-800 pt-8">
            <h3 className="text-base font-serif font-extrabold text-white text-center">Related Products</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
