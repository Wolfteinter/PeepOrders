import { useEffect, useMemo, useState } from 'react';
import { fetchProducts, getFallbackProducts } from '../services/productService';
import { type Product } from '../types/product';

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`;
}

export function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [usingFallback, setUsingFallback] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadProducts() {
      setLoading(true);
      setError('');

      try {
        const result = await fetchProducts();
        if (!isMounted) {
          return;
        }

        setProducts(result);
        setUsingFallback(false);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setProducts(getFallbackProducts());
        setUsingFallback(true);
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'No se pudo cargar el catalogo.',
        );
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  const categoryOptions = useMemo(() => {
    const categories = new Set<string>();

    products.forEach((product) => {
      if (product.category?.trim()) {
        categories.add(product.category.trim());
      }
    });

    return ['all', ...Array.from(categories).sort((left, right) => left.localeCompare(right))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();

    return products.filter((product) => {
      const matchesCategory =
        activeCategory === 'all' || (product.category ?? 'Catalogo general') === activeCategory;

      if (!matchesCategory) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = [
        product.name,
        product.category ?? '',
        product.owner?.name ?? '',
        ...(product.tags ?? []),
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [activeCategory, products, searchValue]);

  const visibleProductCount = filteredProducts.length;

  return (
    <>
      <section className="home-main">
        <div className="home-search-shell">
          <div className="home-search-wrap">
            <label className="home-search-label">
              Buscar producto
              <input
                type="text"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Ej. angel, llavero o figura blanca"
              />
            </label>

            <div className="home-search-summary">
              <strong>{visibleProductCount}</strong>
              <span>{visibleProductCount === 1 ? 'resultado' : 'resultados'}</span>
            </div>
          </div>

          <div className="home-filter-row" aria-label="Categorias">
            {categoryOptions.map((category) => {
              const isActive = activeCategory === category;
              const label = category === 'all' ? 'Todo' : category;

              return (
                <button
                  key={category}
                  type="button"
                  className={`home-filter-chip ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveCategory(category)}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {error ? (
            <p className="helper-text home-api-note">{error}</p>
          ) : null}
        </div>

        <div className="panel home-catalog-panel" id="catalogo">
          <div className="home-section-heading">
            <div>
              <span className="eyebrow">Seleccion actual</span>
              <h2>Catalogo listo para explorar</h2>
            </div>
            {usingFallback ? (
              <span className="badge">Modo demo</span>
            ) : (
              <span className="badge">Datos en vivo</span>
            )}
          </div>

          {loading ? (
            <div className="empty-state">Cargando catalogo...</div>
          ) : (
            <div className="product-grid">
              {filteredProducts.map((product) => (
                <article key={product.id} className="product-card">
                  <div className="product-image-shell">
                    <div className="product-card-badges">
                      <span className="product-card-badge">
                        {product.category ?? 'Catalogo general'}
                      </span>
                    </div>

                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="product-image"
                      />
                    ) : (
                      <div className="product-image product-image-fallback">
                        <span>{product.name.slice(0, 1).toUpperCase()}</span>
                      </div>
                    )}
                  </div>

                  <div className="product-card-copy">
                    <div className="product-card-top">
                      <div>
                        <h3>{product.name}</h3>
                      </div>
                      <strong>{formatCurrency(product.price)}</strong>
                    </div>
                    {product.tags?.length ? (
                      <div className="product-card-tags">
                        {product.tags.slice(0, 3).map((tag) => (
                          <span key={`${product.id}-${tag}`} className="badge">
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </article>
              ))}

              {!filteredProducts.length ? (
                <div className="empty-state">
                  No encontramos productos con ese filtro.
                </div>
              ) : null}
            </div>
          )}
        </div>
      </section>

      {selectedProduct ? (
        <div
          className="modal-backdrop"
          onClick={() => setSelectedProduct(null)}
          role="presentation"
        >
          <div
            className="modal-card modal-card-compact"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={selectedProduct.name}
          >
            <button
              type="button"
              className="ghost-button modal-corner-close"
              onClick={() => setSelectedProduct(null)}
            >
              Cerrar
            </button>

            <div className="product-detail">
              <div className="product-detail-media">
                {selectedProduct.image_url ? (
                  <img
                    src={selectedProduct.image_url}
                    alt={selectedProduct.name}
                    className="product-detail-image"
                  />
                ) : (
                  <div className="product-detail-image product-image-fallback">
                    <span>{selectedProduct.name.slice(0, 1).toUpperCase()}</span>
                  </div>
                )}
              </div>

              <div className="product-detail-copy">
                <span className="eyebrow">
                  {selectedProduct.category ?? 'Catalogo general'}
                </span>
                <h2>{selectedProduct.name}</h2>
                <p className="product-detail-meta">
                  Precio: <strong>{formatCurrency(selectedProduct.price)}</strong>
                </p>

                <div className="product-detail-facts">
                  <div className="product-detail-fact">
                    <span>Variantes</span>
                    <strong>{selectedProduct.variants.length || 'Base'}</strong>
                  </div>
                </div>

                {selectedProduct.tags?.length ? (
                  <div className="product-tags">
                    {selectedProduct.tags.map((tag) => (
                      <span key={`${selectedProduct.id}-${tag}`} className="badge">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}

                {selectedProduct.variants.length ? (
                  <div className="product-variant-list">
                    {selectedProduct.variants.map((variant, index) => (
                      <div
                        key={variant.id ?? `${selectedProduct.id}-variant-${index}`}
                        className="product-variant-card"
                      >
                        <span>{variant.name ?? `Variante ${index + 1}`}</span>
                        {typeof variant.price === 'number' ? (
                          <strong>{formatCurrency(variant.price)}</strong>
                        ) : (
                          <strong>Consultar</strong>
                        )}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
