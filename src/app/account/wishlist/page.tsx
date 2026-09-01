'use client';

import React from 'react';
import Link from 'next/link';
import { Heart, ShoppingCart, Trash2 } from 'lucide-react';
import { useWishlist } from '../../../context/WishlistContext';
import { useCart } from '../../../context/CartContext';
import { useToast } from '../../../components/Toast';
import { PRODUCTS as fallbackProducts, Product } from '../../../data/mockData';
import { useProducts } from '../../../context/ProductContext';
import SafeImage from '../../../components/SafeImage';

export default function AccountWishlistPage() {
  const { wishlist, toggleWishlist } = useWishlist();
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const { products } = useProducts();
  const PRODUCTS = products.length > 0 ? products : fallbackProducts;

  const wishlistItems = PRODUCTS.filter((p) => wishlist.includes(p.id));

  const handleAddToCart = (product: Product) => {
    addToCart(product, 1, {
      size: product.variants?.[0],
      type: product.egglessAvailable ? 'Eggless' : undefined
    });
    showToast(`${product.name} added to cart!`, 'success');
  };

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h3 className="text-lg font-serif font-black text-brand-charcoal">My Saved Favorites</h3>
        <p className="text-xs text-zinc-500">Items you loved and saved for later checkout.</p>
      </div>

      {wishlistItems.length === 0 ? (
        <div className="text-center py-12 border rounded-2xl bg-zinc-50 border-dashed space-y-3">
          <div className="h-12 w-12 rounded-full bg-zinc-100 flex items-center justify-center mx-auto text-zinc-400">
            <Heart className="h-6 w-6" />
          </div>
          <h4 className="text-sm font-bold font-serif">Wishlist is empty</h4>
          <p className="text-xs text-zinc-400">Save items by clicking the heart icons on product cards.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {wishlistItems.map((prod: Product) => (
            <div
              key={prod.id}
              className="border border-zinc-100 rounded-2xl p-4 flex gap-4 hover:border-brand-burgundy/10 transition-colors"
            >
              <SafeImage
                src={prod.image}
                alt={prod.name}
                category={prod.category}
                className="h-16 w-16 object-cover rounded-xl shrink-0"
              />
              
              <div className="flex-grow min-w-0 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold truncate text-zinc-800">{prod.name}</h4>
                  <p className="font-extrabold text-brand-burgundy mt-0.5">₹{prod.price}</p>
                </div>
                
                <div className="flex gap-2 justify-end mt-2">
                  <button
                    onClick={() => {
                      toggleWishlist(prod.id);
                      showToast('Removed from wishlist.', 'info');
                    }}
                    className="p-1.5 border rounded-lg hover:bg-red-50 hover:text-red-500 text-zinc-400 transition-colors"
                    title="Remove from favorites"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleAddToCart(prod)}
                    className="px-3 py-1.5 bg-brand-burgundy hover:bg-brand-burgundy-dark text-white font-bold rounded-lg flex items-center gap-1"
                  >
                    <ShoppingCart className="h-3.5 w-3.5" /> Add
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
