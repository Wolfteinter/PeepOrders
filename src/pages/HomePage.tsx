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

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();

    return products.filter((product) => {
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
  }, [products, searchValue]);

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
          </div>

          {error ? (
            <p className="helper-text home-api-note">{error}</p>
          ) : null}
        </div>

        <div className="panel home-catalog-panel">
          {loading ? (
            <div className="empty-state">Cargando catalogo...</div>
          ) : (
            <div className="product-grid">
              {filteredProducts.map((product) => (
                <article key={product.id} className="product-card">
                  <div className="product-image-shell">
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
                        <p className="product-category">
                          {product.category ?? 'Catalogo general'}
                        </p>
                        <h3>{product.name}</h3>
                      </div>
                      <strong>{formatCurrency(product.price)}</strong>
                    </div>

                    <p className="product-owner">
                      {product.owner?.name ?? 'PeepOrders'}
                    </p>

                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => setSelectedProduct(product)}
                    >
                      Ver detalles
                    </button>
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
                {selectedProduct.tags?.length ? (
                  <div className="product-tags">
                    {selectedProduct.tags.map((tag) => (
                      <span key={`${selectedProduct.id}-${tag}`} className="badge">
                        {tag}
                      </span>
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
