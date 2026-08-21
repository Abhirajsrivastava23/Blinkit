'use client';

import React, { Suspense } from 'react';
import ProductListingPage from '../../components/ProductListingPage';
import { ProductGridSkeleton } from '../../components/LoadingSkeleton';

function ChocolatesPageContent() {
  return (
    <ProductListingPage
      categoryKey="chocolates"
      title="A LITTLE INDULGENCE."
      description="Indulge in artisanal chocolate truffles, organic almond barks, Belgian hazelnut bars, and gold-dusted salted caramels, hand-boxed for luxury gifting."
    />
  );
}

export default function ChocolatesPage() {
  return (
    <Suspense fallback={<ProductGridSkeleton count={8} />}>
      <ChocolatesPageContent />
    </Suspense>
  );
}
