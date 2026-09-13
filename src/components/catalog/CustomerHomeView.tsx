import React, { useState, useEffect } from 'react';
import {
  SlidersHorizontal,
  ChevronDown,
  Sparkles,
  Flame,
  ArrowRight,
  RotateCcw,
  Check,
  TrendingUp,
} from 'lucide-react';
import { Category, Product } from '../../types';
import { ProductCard } from './ProductCard';
import { FilterSidebar, FilterState } from './FilterSidebar';

interface CustomerHomeViewProps {
  products: Product[];
  categories: Category[];
  activeCategorySlug: string;
  onSelectCategory: (slug: string) => void;
  searchQuery: string;
  onClearSearch: () => void;
  onOpenProductDetail: (product: Product) => void;
  onAddToCart: (product: Product, size: string, color: string) => void;
  onBuyNow: (product: Product, size: string, color: string) => void;
  wishlistProductIds: string[];
  onToggleWishlist: (product: Product) => void;
}

export const CustomerHomeView: React.FC<CustomerHomeViewProps> = ({
  products,
  categories,
  activeCategorySlug,
  onSelectCategory,
  searchQuery,
  onClearSearch,
  onOpenProductDetail,
  onAddToCart,
  onBuyNow,
  wishlistProductIds,
  onToggleWishlist,
}) => {
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    categorySlug: activeCategorySlug,
    gender: 'All',
    brand: '',
    size: '',
    color: '',
    minPrice: 0,
    maxPrice: 10000,
    minDiscount: 0,
    minRating: 0,
    inStockOnly: false,
    sort: 'relevance',
  });

  // Sync prop changes
  useEffect(() => {
    setFilters((prev) => ({ ...prev, categorySlug: activeCategorySlug }));
  }, [activeCategorySlug]);

  // Deal countdown timer (hours, mins, secs)
  const [timeLeft, setTimeLeft] = useState({ hours: 7, minutes: 24, seconds: 18 });
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        return { hours: Math.max(0, prev.hours - 1), minutes: 59, seconds: 59 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter & Sort Logic
  const filteredProducts = products.filter((p) => {
    // Category
    if (filters.categorySlug && p.category_slug !== filters.categorySlug) {
      return false;
    }
    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchName = (p.name || '').toLowerCase().includes(q);
      const matchBrand = (p.brand || '').toLowerCase().includes(q);
      const matchCat = (p.category_name || '').toLowerCase().includes(q);
      const matchSku = (p.sku || '').toLowerCase().includes(q);
      const matchDesc = (p.description || '').toLowerCase().includes(q);
      const matchFabric = (p.fabric || '').toLowerCase().includes(q);
      const matchTags = Array.isArray(p.tags) && p.tags.some((t) => t.toLowerCase().includes(q));
      const matchColors = Array.isArray(p.colors) && p.colors.some((c) => c.toLowerCase().includes(q));
      const matchSizes = Array.isArray(p.sizes) && p.sizes.some((s) => s.toLowerCase().includes(q));
      if (!matchName && !matchBrand && !matchCat && !matchSku && !matchDesc && !matchFabric && !matchTags && !matchColors && !matchSizes) {
        return false;
      }
    }
    // Gender
    if (filters.gender !== 'All' && p.gender !== filters.gender && p.gender !== 'Unisex') {
      return false;
    }
    // Brand
    if (filters.brand && p.brand !== filters.brand) {
      return false;
    }
    // Size
    if (filters.size && !p.sizes.includes(filters.size)) {
      return false;
    }
    // Color
    if (filters.color && !p.colors.some((c) => c.toLowerCase().includes(filters.color.toLowerCase()))) {
      return false;
    }
    // Price
    if (p.selling_price < filters.minPrice || p.selling_price > filters.maxPrice) {
      return false;
    }
    // Discount
    if (p.discount_percentage < filters.minDiscount) {
      return false;
    }
    // Rating
    if (p.rating < filters.minRating) {
      return false;
    }
    // In Stock
    if (filters.inStockOnly && p.stock <= 0) {
      return false;
    }

    return true;
  });

  // Sorting Logic
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (filters.sort) {
      case 'price_asc':
        return a.selling_price - b.selling_price;
      case 'price_desc':
        return b.selling_price - a.selling_price;
      case 'newest':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'discount':
        return b.discount_percentage - a.discount_percentage;
      case 'rating':
        return b.rating - a.rating;
      default:
        return 0; // relevance
    }
  });

  const activeCategoryObj = categories.find((c) => c.slug === filters.categorySlug);

  return (
    <div id="customer-home-view" className="bg-slate-50 min-h-screen pb-16">
      {/* Hero Banner Section (Show when no specific search or filter is active) */}
      {!searchQuery && !filters.categorySlug && (
        <section id="hero-banner-section" className="relative bg-slate-900 text-white overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 py-10 md:py-16 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            {/* Left Content */}
            <div className="md:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold uppercase tracking-wider">
                <Flame className="w-3.5 h-3.5 fill-rose-500" />
                <span>The Big Indian Festive Fashion Week</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
                Authentic Indian Apparel. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-rose-400 to-indigo-400">
                  Direct From The Looms.
                </span>
              </h1>

              <p className="text-slate-300 text-sm sm:text-base max-w-xl leading-relaxed">
                Discover over 200+ handcrafted garments — from rugged denim & oversized streetwear to
                pure cotton shirts and Lucknowi Chikankari kurtis.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  id="hero-shop-jeans-btn"
                  onClick={() => onSelectCategory('jeans')}
                  className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-sm shadow-md flex items-center gap-2 transition-all"
                >
                  <span>SHOP DENIM EDIT</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  id="hero-shop-kurtis-btn"
                  onClick={() => onSelectCategory('kurtis')}
                  className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-sm border border-slate-700 transition-colors"
                >
                  Ethnic Kurtis & Sets
                </button>
              </div>

              {/* Assurances Row */}
              <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-6 text-xs text-slate-400">
                <span className="flex items-center gap-1.5 font-semibold text-slate-300">
                  <Check className="w-4 h-4 text-emerald-400" /> Cash on Delivery Available
                </span>
                <span className="flex items-center gap-1.5 font-semibold text-slate-300">
                  <Check className="w-4 h-4 text-emerald-400" /> Free Returns in 7 Days
                </span>
                <span className="flex items-center gap-1.5 font-semibold text-slate-300">
                  <Check className="w-4 h-4 text-emerald-400" /> 100% Genuine Certified
                </span>
              </div>
            </div>

            {/* Right Visual Image Bento */}
            <div className="md:col-span-5 grid grid-cols-2 gap-3 relative">
              <div className="space-y-3">
                <div className="h-44 rounded-2xl overflow-hidden border border-slate-700 shadow-lg">
                  <img
                    src="https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&q=80"
                    alt="Denim Jeans"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="h-40 rounded-2xl overflow-hidden border border-slate-700 shadow-lg">
                  <img
                    src="https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80"
                    alt="Cotton T-shirt"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="space-y-3 pt-6">
                <div className="h-40 rounded-2xl overflow-hidden border border-slate-700 shadow-lg">
                  <img
                    src="https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&q=80"
                    alt="Linen Shirt"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="h-44 rounded-2xl overflow-hidden border border-slate-700 shadow-lg">
                  <img
                    src="https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80"
                    alt="Lucknowi Kurti"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Category Story Circles Carousel (Flipkart / Myntra Style) */}
      <section id="category-circle-strip" className="bg-white border-b border-slate-200 py-4 px-4">
        <div className="max-w-7xl mx-auto flex items-center gap-3 sm:gap-6 overflow-x-auto scrollbar-none">
          <button
            onClick={() => onSelectCategory('')}
            className="flex flex-col items-center gap-1.5 shrink-0 group"
          >
            <div
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full p-0.5 border-2 transition-all flex items-center justify-center ${
                !activeCategorySlug
                  ? 'border-indigo-600 shadow-md bg-indigo-50'
                  : 'border-slate-200 group-hover:border-indigo-400 bg-slate-50'
              }`}
            >
              <div className="w-full h-full rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                ALL
              </div>
            </div>
            <span className="text-xs font-semibold text-slate-800">All Items</span>
          </button>

          {categories
            .filter((c) => c.status === 'ACTIVE')
            .map((cat) => {
              const isCatActive = activeCategorySlug === cat.slug;
              return (
                <button
                  key={cat.id}
                  id={`cat-circle-${cat.slug}`}
                  onClick={() => onSelectCategory(cat.slug)}
                  className="flex flex-col items-center gap-1.5 shrink-0 group"
                >
                  <div
                    className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full p-0.5 border-2 transition-all overflow-hidden ${
                      isCatActive
                        ? 'border-indigo-600 ring-2 ring-indigo-200 shadow-md'
                        : 'border-slate-200 group-hover:border-indigo-400'
                    }`}
                  >
                    <img
                      src={cat.image_url}
                      alt={cat.name}
                      className="w-full h-full object-cover rounded-full group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                  <span
                    className={`text-xs whitespace-nowrap ${
                      isCatActive ? 'font-black text-indigo-700' : 'font-medium text-slate-700'
                    }`}
                  >
                    {cat.name}
                  </span>
                </button>
              );
            })}
        </div>
      </section>

      {/* Main Marketplace Area */}
      <main className="max-w-7xl mx-auto px-4 pt-6">
        {/* Active Title & Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              {searchQuery ? (
                <span>
                  Search results for "<span className="text-indigo-600">{searchQuery}</span>"
                </span>
              ) : activeCategoryObj ? (
                <span>{activeCategoryObj.name}</span>
              ) : (
                <span>All Garments & Apparel</span>
              )}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing {sortedProducts.length} curated products
            </p>
          </div>

          {/* Right Controls: Filter button on mobile & Sort dropdown */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile filter toggle */}
            <button
              id="mobile-open-filters-btn"
              onClick={() => setMobileFilterOpen(true)}
              className="lg:hidden px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 flex items-center gap-1.5 shadow-2xs"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters</span>
            </button>

            {/* Sort Selector */}
            <div className="relative flex items-center">
              <span className="text-xs text-slate-400 font-medium mr-2 hidden sm:inline">
                Sort by:
              </span>
              <select
                id="catalog-sort-select"
                value={filters.sort}
                onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
                className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-hidden focus:border-indigo-600 cursor-pointer shadow-2xs"
              >
                <option value="relevance">Relevance</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="discount">Biggest Discount</option>
                <option value="rating">Customer Rating</option>
                <option value="newest">Newest First</option>
              </select>
            </div>
          </div>
        </div>

        {/* Active Filters Pill Strip */}
        {(filters.brand ||
          filters.size ||
          filters.gender !== 'All' ||
          filters.minDiscount > 0 ||
          filters.minRating > 0 ||
          filters.inStockOnly ||
          searchQuery) && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="text-xs text-slate-400 font-semibold">Active:</span>

            {searchQuery && (
              <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold rounded-full flex items-center gap-1">
                Search: {searchQuery}
                <button onClick={onClearSearch}>×</button>
              </span>
            )}

            {filters.gender !== 'All' && (
              <span className="px-2.5 py-1 bg-slate-100 border border-slate-300 text-slate-800 text-xs font-bold rounded-full flex items-center gap-1">
                Gender: {filters.gender}
                <button onClick={() => setFilters({ ...filters, gender: 'All' })}>×</button>
              </span>
            )}

            {filters.brand && (
              <span className="px-2.5 py-1 bg-slate-100 border border-slate-300 text-slate-800 text-xs font-bold rounded-full flex items-center gap-1">
                Brand: {filters.brand}
                <button onClick={() => setFilters({ ...filters, brand: '' })}>×</button>
              </span>
            )}

            {filters.size && (
              <span className="px-2.5 py-1 bg-slate-100 border border-slate-300 text-slate-800 text-xs font-bold rounded-full flex items-center gap-1">
                Size: {filters.size}
                <button onClick={() => setFilters({ ...filters, size: '' })}>×</button>
              </span>
            )}

            {filters.minDiscount > 0 && (
              <span className="px-2.5 py-1 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-full flex items-center gap-1">
                {filters.minDiscount}%+ Off
                <button onClick={() => setFilters({ ...filters, minDiscount: 0 })}>×</button>
              </span>
            )}

            <button
              onClick={() => {
                onClearSearch();
                setFilters({
                  ...filters,
                  gender: 'All',
                  brand: '',
                  size: '',
                  color: '',
                  minPrice: 0,
                  maxPrice: 10000,
                  minDiscount: 0,
                  minRating: 0,
                  inStockOnly: false,
                });
              }}
              className="text-xs font-bold text-rose-600 hover:underline ml-1"
            >
              Clear All
            </button>
          </div>
        )}

        {/* Layout Grid: Sidebar + Product Grid */}
        <div className="flex gap-6 items-start">
          {/* Desktop Filter Sidebar */}
          <FilterSidebar
            categories={categories}
            filters={filters}
            onChangeFilters={setFilters}
            isOpenMobile={mobileFilterOpen}
            onCloseMobile={() => setMobileFilterOpen(false)}
            totalProductsCount={sortedProducts.length}
          />

          {/* Product Cards Grid */}
          <div className="flex-1">
            {sortedProducts.length === 0 ? (
              <div
                id="no-products-found"
                className="bg-white rounded-2xl border border-slate-200 p-12 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
                  <SlidersHorizontal className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-800">No matching garments found</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-5">
                  Try adjusting your filters, selecting a different category, or resetting to see all products.
                </p>
                <button
                  id="reset-filter-empty-btn"
                  onClick={() => {
                    onClearSearch();
                    setFilters({
                      categorySlug: '',
                      gender: 'All',
                      brand: '',
                      size: '',
                      color: '',
                      minPrice: 0,
                      maxPrice: 10000,
                      minDiscount: 0,
                      minRating: 0,
                      inStockOnly: false,
                      sort: 'relevance',
                    });
                    onSelectCategory('');
                  }}
                  className="px-5 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  View All Garments
                </button>
              </div>
            ) : (
              <div
                id="product-catalog-grid"
                className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-5"
              >
                {sortedProducts.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    onOpenDetail={onOpenProductDetail}
                    onAddToCart={onAddToCart}
                    onBuyNow={onBuyNow}
                    isWishlisted={wishlistProductIds.includes(p.id)}
                    onToggleWishlist={onToggleWishlist}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
