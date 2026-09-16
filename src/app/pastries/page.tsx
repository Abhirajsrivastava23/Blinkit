'use client';

import React, { Suspense } from 'react';
import ProductListingPage from '../../components/ProductListingPage';
import { ProductGridSkeleton } from '../../components/LoadingSkeleton';

function PastriesPageContent() {
  return (
    <ProductListingPage
      categoryKey="Pastries"
      title="SMALL BITES. BIG JOY."
      description="Artisanal single-serve dessert pastries and celebration party packs. Freshly handcrafted with delivery within 24 hours."
    />
  );
}

export default function PastriesPage() {
  return (
    <Suspense fallback={<ProductGridSkeleton count={8} />}>
      <PastriesPageContent />
    </Suspense>
  );
}
