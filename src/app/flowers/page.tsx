'use client';

import React, { Suspense } from 'react';
import ProductListingPage from '../../components/ProductListingPage';
import { ProductGridSkeleton } from '../../components/LoadingSkeleton';

function FlowersPageContent() {
  return (
    <ProductListingPage
      categoryKey="flowers"
      title="FLOWERS THAT SAY IT BEAUTIFULLY."
      description="Celebrate life's highlights with our handpicked fresh roses, tulips, lilies, and preserved everlasting floral domes, arranged by designer florists."
    />
  );
}

export default function FlowersPage() {
  return (
    <Suspense fallback={<ProductGridSkeleton count={8} />}>
      <FlowersPageContent />
    </Suspense>
  );
}
