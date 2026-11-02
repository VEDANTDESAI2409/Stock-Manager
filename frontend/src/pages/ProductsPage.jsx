import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Badge from '../components/common/Badge';
import EmptyState from '../components/common/EmptyState';
import ConfirmModal from '../components/common/ConfirmModal';
import api from '../services/api';
import useApiQuery from '../services/useApiQuery';
import { useToast } from '../context/ToastContext';
import {
  Boxes,
  Plus,
  Search,
  Filter,
  ShieldAlert,
  ArrowDownLeft,
  ArrowUpRight,
  Sliders,
  Eye,
  Edit2,
  Trash2,
  Tags,
} from 'lucide-react';

// Modals
import ProductFormModal from '../components/stock/ProductFormModal';
import StockInModal from '../components/stock/StockInModal';
import StockOutModal from '../components/stock/StockOutModal';
import StockAdjustModal from '../components/stock/StockAdjustModal';
import CategoryManageModal from '../components/stock/CategoryManageModal';
import ProductDetailModal from '../components/stock/ProductDetailModal';

const ProductsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { showSuccess, showError } = useToast();

  // Filters
  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [lowStockOnly, setLowStockOnly] = useState(searchParams.get('lowStock') === 'true');
  const categoriesQuery = useApiQuery('/categories', { staleTime: 60_000 });
  const productParams = {
    search: submittedSearch || undefined,
    category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
    lowStock: lowStockOnly ? 'true' : undefined,
    all: 'true',
  };
  const productsQuery = useApiQuery('/products', { params: productParams, staleTime: 20_000 });
  const categories = categoriesQuery.data?.data || [];
  const products = productsQuery.data?.data || [];
  const loading = categoriesQuery.isLoading || productsQuery.isLoading;

  // Modal Triggers & Selected Product
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const [isStockInOpen, setIsStockInOpen] = useState(false);
  const [isStockOutOpen, setIsStockOutOpen] = useState(false);
  const [isStockAdjustOpen, setIsStockAdjustOpen] = useState(false);
  const [activeModalProduct, setActiveModalProduct] = useState(null);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [detailProductId, setDetailProductId] = useState(null);

  // Deletion confirm modal
  const [productToDelete, setProductToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSubmittedSearch(search.trim());
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    try {
      await api.delete(`/products/${productToDelete._id}`);
      showSuccess(`Product "${productToDelete.name}" deleted successfully.`);
      setProductToDelete(null);
    } catch (err) {
      showError(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-content-primary tracking-tight">
            Products & Stock Inventory
          </h1>
          <p className="text-xs sm:text-sm text-content-secondary mt-0.5">
            Manage CCTV cameras, recorders, cables, connectors, and monitor real-time stock levels
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-content-secondary hover:text-content-primary bg-white hover:bg-slate-50 border border-surface-border rounded-xl transition shadow-soft-sm"
          >
            <Tags className="w-3.5 h-3.5" />
            Categories
          </button>
          <button
            onClick={() => {
              setActiveModalProduct(null);
              setIsStockInOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-xl transition"
          >
            <ArrowDownLeft className="w-3.5 h-3.5 text-primary-600" />
            Stock In
          </button>
          <button
            onClick={() => {
              setEditingProduct(null);
              setIsProductModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-primary-500 hover:bg-primary-600 rounded-xl shadow-soft transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Product
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-surface-border shadow-soft flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="w-4 h-4 text-content-muted absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product name or specifications..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-surface-border focus:outline-none focus:border-primary-500 text-xs sm:text-sm font-medium"
          />
        </form>

        {/* Category & Low Stock Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSubmittedSearch(search.trim());
              setSelectedCategory(e.target.value);
            }}
            className="px-3 py-2 rounded-xl border border-surface-border text-xs sm:text-sm font-medium focus:outline-none focus:border-primary-500 bg-white"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              setSubmittedSearch(search.trim());
              setLowStockOnly(!lowStockOnly);
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition border ${
              lowStockOnly
                ? 'bg-amber-500 text-white border-amber-500'
                : 'bg-white text-content-secondary border-surface-border hover:bg-slate-50'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Low Stock Alert</span>
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-surface-border shadow-soft overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-content-secondary font-medium">
            Loading CCTV inventory catalog...
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            title="No Products Found"
            description="No products matched your search or filter criteria."
            actionText="Clear Filters"
            onAction={() => {
              setSearch('');
              setSubmittedSearch('');
              setSelectedCategory('ALL');
              setLowStockOnly(false);
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-surface-border text-content-secondary uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Unit</th>
                  <th className="py-3 px-4 text-center">Current Stock</th>
                  <th className="py-3 px-4 text-center">Min Threshold</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Inventory Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {products.map((prod) => {
                  const isLow = prod.currentStock <= prod.minStock;
                  return (
                    <tr key={prod._id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Product Name */}
                      <td className="py-3 px-4">
                        <span
                          onClick={() => setDetailProductId(prod._id)}
                          className="font-bold text-content-primary hover:text-primary-600 cursor-pointer block text-sm"
                        >
                          {prod.name}
                        </span>
                        {typeof prod.modelNumber === 'string' && prod.modelNumber !== '' && (
                          <span className="text-[11px] text-content-muted block mt-0.5 whitespace-pre-wrap break-all">
                            Model: {prod.modelNumber}
                          </span>
                        )}
                        {prod.description && (
                          <span className="text-[11px] text-content-muted block truncate max-w-xs mt-0.5">
                            {prod.description}
                          </span>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4">
                        <Badge variant="neutral">{prod.category?.name || 'Uncategorized'}</Badge>
                      </td>

                      {/* Unit */}
                      <td className="py-3 px-4 font-semibold text-content-secondary">
                        {prod.unit}
                      </td>

                      {/* Current Stock */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`font-black text-sm px-2.5 py-1 rounded-lg ${
                            isLow
                              ? 'text-status-danger bg-rose-50 border border-rose-200'
                              : 'text-content-primary bg-slate-100'
                          }`}
                        >
                          {prod.currentStock}
                        </span>
                      </td>

                      {/* Min Stock */}
                      <td className="py-3 px-4 text-center font-bold text-content-secondary">
                        {prod.minStock}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        {isLow ? (
                          <Badge variant="warning" size="xs">
                            <ShieldAlert className="w-3 h-3 mr-1" />
                            Low Stock
                          </Badge>
                        ) : (
                          <Badge variant="success" size="xs">
                            Adequate
                          </Badge>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Stock In */}
                          <button
                            onClick={() => {
                              setActiveModalProduct(prod);
                              setIsStockInOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition"
                            title="Stock In (Add Received Material)"
                          >
                            <ArrowDownLeft className="w-4 h-4" />
                          </button>

                          {/* Stock Out */}
                          <button
                            onClick={() => {
                              setActiveModalProduct(prod);
                              setIsStockOutOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-rose-700 bg-rose-50 hover:bg-rose-100 transition"
                            title="Manual Stock Out (Defect/Damage/Dispose)"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </button>

                          {/* Stock Adjust */}
                          <button
                            onClick={() => {
                              setActiveModalProduct(prod);
                              setIsStockAdjustOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-primary-700 bg-primary-50 hover:bg-primary-100 transition"
                            title="Audit Stock Adjustment"
                          >
                            <Sliders className="w-4 h-4" />
                          </button>

                          {/* View details */}
                          <button
                            onClick={() => setDetailProductId(prod._id)}
                            className="p-1.5 rounded-lg text-content-secondary hover:text-content-primary hover:bg-slate-100 transition"
                            title="View Product History"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => {
                              setEditingProduct(prod);
                              setIsProductModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-content-secondary hover:text-primary-600 hover:bg-slate-100 transition"
                            title="Edit Product"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setProductToDelete(prod)}
                            className="p-1.5 rounded-lg text-content-secondary hover:text-status-danger hover:bg-rose-50 transition"
                            title="Delete Product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <ProductFormModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        product={editingProduct}
        categories={categories}
      />

      <StockInModal
        isOpen={isStockInOpen}
        onClose={() => setIsStockInOpen(false)}
        products={products}
        preselectedProduct={activeModalProduct}
      />

      <StockOutModal
        isOpen={isStockOutOpen}
        onClose={() => setIsStockOutOpen(false)}
        products={products}
        preselectedProduct={activeModalProduct}
      />

      <StockAdjustModal
        isOpen={isStockAdjustOpen}
        onClose={() => setIsStockAdjustOpen(false)}
        products={products}
        preselectedProduct={activeModalProduct}
      />

      <CategoryManageModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={categories}
      />

      <ProductDetailModal
        isOpen={!!detailProductId}
        onClose={() => setDetailProductId(null)}
        productId={detailProductId}
      />

      <ConfirmModal
        isOpen={!!productToDelete}
        onClose={() => setProductToDelete(null)}
        onConfirm={handleDeleteProduct}
        title={`Delete "${productToDelete?.name}"?`}
        message="Are you sure you want to remove this product? Safeguards will verify that the current stock is 0 and no active work orders reference it."
        confirmText="Confirm Delete"
        isDanger={true}
        loading={isDeleting}
      />
    </div>
  );
};

export default ProductsPage;
