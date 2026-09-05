'use client';

import React, { Suspense } from 'react';
import ProductListingPage from '../../components/ProductListingPage';
import { ProductGridSkeleton } from '../../components/LoadingSkeleton';

function ChocolateCakesContent() {
  return (
    <ProductListingPage
      categoryKey="Chocolate Cakes"
      title="DECADENT CHOCOLATE CAKES FOR TRUE INDULGENCE."
      description="From silky dark chocolate truffle and KitKat cakes to authentic Belgian couverture creations, satisfy every chocolate craving."
    />
  );
}

export default function ChocolateCakesPage() {
  return (
    <Suspense fallback={<ProductGridSkeleton count={8} />}>
      <ChocolateCakesContent />
    </Suspense>
  );
}
