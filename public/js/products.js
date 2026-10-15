let currentPage = 1;
let searchTimeout;

function debounceSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(applyFilters, 400);
}

async function loadCategories() {
  const cats = await fetch('/api/products/categories').then(r => r.json());
  const catSelect = document.getElementById('filterCategory');
  const brands = new Set();
  cats.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.slug; opt.textContent = c.name;
    catSelect.appendChild(opt);
    c.children?.forEach(sub => {
      const sOpt = document.createElement('option');
      sOpt.value = sub.slug; sOpt.textContent = '  ' + sub.name;
      catSelect.appendChild(sOpt);
    });
  });
  // Load brands from products
  const allProducts = await fetch('/api/products?limit=200').then(r => r.json());
  allProducts.products.forEach(p => { if (p.brand) brands.add(p.brand); });
  const brandSelect = document.getElementById('filterBrand');
  [...brands].sort().forEach(b => {
    const opt = document.createElement('option');
    opt.value = b; opt.textContent = b;
    brandSelect.appendChild(opt);
  });
}

function applyFilters() {
  const params = new URLSearchParams();
  const search = document.getElementById('searchInput')?.value;
  const category = document.getElementById('filterCategory')?.value;
  const subcategory = document.getElementById('filterSubcategory')?.value;
  const brand = document.getElementById('filterBrand')?.value;
  const price = document.getElementById('filterPrice')?.value;
  const sort = document.getElementById('filterSort')?.value;
  const page = currentPage;

  if (search) params.set('search', search);
  if (category) params.set('category', category);
  if (subcategory) params.set('subcategory', subcategory);
  if (brand) params.set('brand', brand);
  if (price && price < 5000) params.set('max_price', price);
  if (sort) params.set('sort', sort);
  params.set('page', page);

  fetch(`/api/products?${params}`)
    .then(r => r.json())
    .then(data => {
      const grid = document.getElementById('productsGrid');
      grid.innerHTML = data.products.length
        ? data.products.map(productCard).join('')
        : '<p style="color:var(--text-muted);grid-column:1/-1;text-align:center;padding:40px;">No se encontraron productos.</p>';
      document.getElementById('resultsCount').textContent = `${data.total} producto(s) encontrado(s)`;
      renderPagination(data.page, data.pages);
    });
}

function renderPagination(page, pages) {
  if (pages <= 1) return;
  const el = document.getElementById('pagination');
  let html = '';
  for (let i = 1; i <= pages; i++) {
    html += `<button class="${i === page ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
  }
  el.innerHTML = html;
}

function goToPage(p) { currentPage = p; applyFilters(); window.scrollTo({ top: 0, behavior: 'smooth' }); }

function resetFilters() {
  document.getElementById('searchInput').value = '';
  document.getElementById('filterCategory').value = '';
  document.getElementById('filterBrand').value = '';
  document.getElementById('filterPrice').value = 5000;
  document.getElementById('priceLabel').textContent = '$5000';
  document.getElementById('filterSort').value = 'newest';
  currentPage = 1;
  applyFilters();
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  loadCategories();
  // Read URL params
  const urlParams = new URLSearchParams(location.search);
  if (urlParams.get('category')) {
    document.getElementById('filterCategory').value = urlParams.get('category');
  }
  applyFilters();
});   