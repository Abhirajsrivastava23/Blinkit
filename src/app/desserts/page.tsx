'use client';

import React, { Suspense } from 'react';
import ProductListingPage from '../../components/ProductListingPage';
import { ProductGridSkeleton } from '../../components/LoadingSkeleton';

function DessertsPageContent() {
  return (
    <ProductListingPage
      categoryKey="Desserts"
      title="GOURMET DESSERTS, JAR CAKES & CHEESECAKES."
      description="Chilled cheesecakes, portable jar cakes, chocolate mousse verrine cups, Dubai kunafa tubs, and giant American scoop cookies."
    />
  );
}

export default function DessertsPage() {
  return (
    <Suspense fallback={<ProductGridSkeleton count={8} />}>
      <DessertsPageContent />
    </Suspense>
  );
}
