'use client';

import React, { Suspense } from 'react';
import ProductListingPage from '../../components/ProductListingPage';
import { ProductGridSkeleton } from '../../components/LoadingSkeleton';

function GiftsPageContent() {
  return (
    <ProductListingPage
      categoryKey="gifts"
      title="A LITTLE SOMETHING, JUST FOR THEM."
      description="From premium leather accessory sets and organic desktop succulents to personalized photo plaques and luxury gift hampers, find the ultimate gesture."
    />
  );
}

export default function GiftsPage() {
  return (
    <Suspense fallback={<ProductGridSkeleton count={8} />}>
      <GiftsPageContent />
    </Suspense>
  );
}
