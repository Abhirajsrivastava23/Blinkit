'use client';

import React, { Suspense } from 'react';
import ProductListingPage from '../../components/ProductListingPage';
import { ProductGridSkeleton } from '../../components/LoadingSkeleton';

function BeerThemeCakesContent() {
  return (
    <ProductListingPage
      categoryKey="Beer Theme Cakes"
      title="BEER & CELEBRATION THEME CAKES."
      description="Elevate bachelor bashes, milestones, and weekend celebrations with handcrafted beer mug, bottle, and whiskey theme designer cakes."
    />
  );
}

export default function BeerThemeCakesPage() {
  return (
    <Suspense fallback={<ProductGridSkeleton count={8} />}>
      <BeerThemeCakesContent />
    </Suspense>
  );
}
