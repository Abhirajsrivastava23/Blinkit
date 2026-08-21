'use client';

import React, { Suspense } from 'react';
import ProductListingPage from '../../components/ProductListingPage';
import { ProductGridSkeleton } from '../../components/LoadingSkeleton';

function CelebrationsPageContent() {
  return (
    <ProductListingPage
      categoryKey="celebrations"
      title="Celebration & Party Kits"
      description="Make birthday or anniversary setup easy. Find metallic balloons, sparkler candles, foil curtain backdrops, paper party packs, and elegant wooden cake knifes."
    />
  );
}

export default function CelebrationsPage() {
  return (
    <Suspense fallback={<ProductGridSkeleton count={8} />}>
      <CelebrationsPageContent />
    </Suspense>
  );
}
