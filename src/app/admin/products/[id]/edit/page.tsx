'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import ProductForm from '../../../../../components/ProductForm';
import { Product } from '../../../../../data/mockData';
import { RefreshCw } from 'lucide-react';

export default function EditProductAdminPage() {
  const params = useParams();
  const id = params.id as string;
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/products/${id}`);
        if (res.ok) {
          const data = await res.json();
          setProduct(data);
        }
      } catch (error) {
        console.error('Error fetching product for edit:', error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProduct();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-6 w-6 text-brand-burgundy animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center p-8">
        <h3 className="text-sm font-bold text-red-650">Product Not Found</h3>
        <p className="text-xs text-zinc-500 mt-1">The requested product SKU could not be located in the database.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#FAF9F6] p-6 rounded-3xl min-h-screen">
      <ProductForm initialProduct={product} />
    </div>
  );
}
