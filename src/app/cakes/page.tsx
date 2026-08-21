'use client';

import React, { Suspense } from 'react';
import ProductListingPage from '../../components/ProductListingPage';
import { ProductGridSkeleton } from '../../components/LoadingSkeleton';

function CakesPageContent() {
  return (
    <ProductListingPage
      categoryKey="cakes"
      title="CAKES THAT MAKE THEM SMILE."
      description="Indulge in our exquisite collection of premium cakes, from classic Chocolate Truffle to custom designer creations, hand-baked fresh and delivered in minutes."
    />
  );
}

export default function CakesPage() {
  return (
    <Suspense fallback={<ProductGridSkeleton count={8} />}>
      <CakesPageContent />
    </Suspense>
  );
}
