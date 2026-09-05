'use client';

import React, { Suspense } from 'react';
import ProductListingPage from '../../components/ProductListingPage';
import { ProductGridSkeleton } from '../../components/LoadingSkeleton';

function BirthdayCakesContent() {
  return (
    <ProductListingPage
      categoryKey="Birthday Cakes"
      title="BIRTHDAY CAKES FOR UNFORGETTABLE MOMENTS."
      description="Handcrafted celebration cakes, designer cakes, photo cakes, and fusion cakes baked fresh and delivered fatafat to your doorstep."
    />
  );
}

export default function BirthdayCakesPage() {
  return (
    <Suspense fallback={<ProductGridSkeleton count={8} />}>
      <BirthdayCakesContent />
    </Suspense>
  );
}
