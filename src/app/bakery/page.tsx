'use client';

import React, { Suspense } from 'react';
import ProductListingPage from '../../components/ProductListingPage';
import { ProductGridSkeleton } from '../../components/LoadingSkeleton';

function BakeryPageContent() {
  return (
    <ProductListingPage
      categoryKey="bakery"
      title="FRESH FROM THE OVEN."
      description="Enjoy freshly baked croissants, cheesecakes, fudgy brownies, soft-glazed donuts, and gourmet cupcakes, crafted using the finest rich ingredients."
    />
  );
}

export default function BakeryPage() {
  return (
    <Suspense fallback={<ProductGridSkeleton count={8} />}>
      <BakeryPageContent />
    </Suspense>
  );
}
