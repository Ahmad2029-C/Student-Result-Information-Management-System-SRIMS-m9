'use strict';

var state = {
  products: [],
  categories: [],
  brands: [],
  reviews: [],
  news: [],
  videos: [],
  stats: [],
  activeFilter: 'all',
  activeTab: 'trending',
  maxPrice: 2000,
  sort: 'featured',
  wishlist: JSON.parse(localStorage.getItem('wishlist') || '[]'),
  cart: JSON.parse(localStorage.getItem('cart') || '[]'),
  compare: JSON.parse(localStorage.getItem('compare') || '[]')
};

var money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
var els = {};

document.addEventListener('DOMContentLoaded', function () {
  cacheElements();
  applySavedMode();
  showProductSkeletons();
  bindEvents();
  loadHomeData();
  startCountdown();
  setTimeout(function () {
    if (els.loadingScreen) els.loadingScreen.classList.add('hidden');
  }, 650);
});

function cacheElements() {
  els.loadingScreen = document.getElementById('loadingScreen');
  els.modeToggle = document.getElementById('modeToggle');
  els.menuToggle = document.getElementById('menuToggle');
  els.categoryNav = document.getElementById('categoryNav');
  els.searchForm = document.getElementById('searchForm');
  els.searchInput = document.getElementById('searchInput');
  els.categorySelect = document.getElementById('categorySelect');
  els.searchSuggestions = document.getElementById('searchSuggestions');
  els.voiceButton = document.getElementById('voiceButton');
  els.categoryGrid = document.getElementById('categoryGrid');
  els.featuredGrid = document.getElementById('featuredGrid');
  els.dealProducts = document.getElementById('dealProducts');
  els.collectionGrid = document.getElementById('collectionGrid');
  els.brandStrip = document.getElementById('brandStrip');
  els.reviewList = document.getElementById('reviewList');
  els.newsList = document.getElementById('newsList');
  els.videoList = document.getElementById('videoList');
  els.statsGrid = document.getElementById('statsGrid');
  els.priceRange = document.getElementById('priceRange');
  els.priceLabel = document.getElementById('priceLabel');
  els.sortSelect = document.getElementById('sortSelect');
  els.toastRegion = document.getElementById('toastRegion');
  els.wishlistCount = document.getElementById('wishlistCount');
  els.cartCount = document.getElementById('cartCount');
  els.copyCoupon = document.getElementById('copyCoupon');
  els.newsletterForm = document.getElementById('newsletterForm');
  els.shuffleCategories = document.getElementById('shuffleCategories');
  els.chatButton = document.getElementById('chatButton');
  els.qrButton = document.getElementById('qrButton');
  els.languageButton = document.getElementById('languageButton');
  els.currencyButton = document.getElementById('currencyButton');
  els.aiPickTitle = document.getElementById('aiPickTitle');
}

function bindEvents() {
  els.modeToggle.addEventListener('click', toggleMode);
  els.menuToggle.addEventListener('click', toggleMobileMenu);
  els.searchForm.addEventListener('submit', submitSearch);
  els.searchInput.addEventListener('input', updateSuggestions);
  els.searchInput.addEventListener('focus', updateSuggestions);
  document.addEventListener('click', closeSuggestionsOnOutsideClick);
  els.voiceButton.addEventListener('click', startVoiceSearch);
  els.priceRange.addEventListener('input', function () {
    state.maxPrice = Number(els.priceRange.value);
    els.priceLabel.textContent = money.format(state.maxPrice);
    renderFeaturedProducts();
  });
  els.sortSelect.addEventListener('change', function () {
    state.sort = els.sortSelect.value;
    renderFeaturedProducts();
  });
  document.querySelectorAll('.filter-chip').forEach(function (button) {
    button.addEventListener('click', function () {
      document.querySelectorAll('.filter-chip').forEach(function (chip) { chip.classList.remove('active'); });
      button.classList.add('active');
      state.activeFilter = button.dataset.filter;
      renderFeaturedProducts();
    });
  });
  document.querySelectorAll('.tab-button').forEach(function (button) {
    button.addEventListener('click', function () {
      document.querySelectorAll('.tab-button').forEach(function (tab) { tab.classList.remove('active'); });
      button.classList.add('active');
      state.activeTab = button.dataset.tab;
      renderCollectionProducts();
    });
  });
  els.copyCoupon.addEventListener('click', copyCouponCode);
  els.newsletterForm.addEventListener('submit', subscribeNewsletter);
  els.shuffleCategories.addEventListener('click', function () {
    state.categories = state.categories.slice().sort(function () { return Math.random() - 0.5; });
    renderCategories();
    toast('Categories refreshed.');
  });
  els.chatButton.addEventListener('click', function () { toast('Chatbot module will connect in a later step.'); });
  els.qrButton.addEventListener('click', function () { toast('QR and barcode generator module is reserved for the product detail step.'); });
  els.languageButton.addEventListener('click', function () { toast('Language selector ready for i18n data.'); });
  els.currencyButton.addEventListener('click', function () { toast('Currency selector ready for exchange-rate service.'); });
}

function applySavedMode() {
  var saved = localStorage.getItem('theme');
  if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.body.classList.add('dark');
  }
}

function toggleMode() {
  document.body.classList.toggle('dark');
  localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
}

function toggleMobileMenu() {
  var isOpen = els.categoryNav.classList.toggle('open');
  document.body.classList.toggle('menu-open', isOpen);
  els.menuToggle.setAttribute('aria-expanded', String(isOpen));
}

function showProductSkeletons() {
  els.featuredGrid.innerHTML = Array.from({ length: 8 }).map(function () { return '<div class="skeleton"></div>'; }).join('');
}

async function loadHomeData() {
  try {
    var response = await fetch('data/products.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Could not load homepage data');
    var data = await response.json();
    Object.assign(state, data);
    updateCounters();
    renderAll();
  } catch (error) {
    els.featuredGrid.innerHTML = '<p>Homepage data could not load. Please run the site through the local server.</p>';
    toast('Could not load product data.');
  }
}

function renderAll() {
  renderCategories();
  renderFeaturedProducts();
  renderDealProducts();
  renderCollectionProducts();
  renderBrands();
  renderReviews();
  renderNews();
  renderVideos();
  renderStats();
  updateAiPick();
}

function renderCategories() {
  els.categoryGrid.innerHTML = state.categories.slice(0, 15).map(function (category) {
    return '<a href="#featured" class="category-card" data-category="' + escapeHtml(category.name) + '">' +
      '<span class="category-icon" aria-hidden="true">' + escapeHtml(category.initials) + '</span>' +
      '<strong>' + escapeHtml(category.name) + '</strong>' +
      '<span>' + category.count + ' items</span>' +
    '</a>';
  }).join('');
  els.categoryGrid.querySelectorAll('.category-card').forEach(function (card) {
    card.addEventListener('click', function () {
      state.activeFilter = card.dataset.category;
      document.querySelectorAll('.filter-chip').forEach(function (chip) { chip.classList.toggle('active', chip.dataset.filter === state.activeFilter); });
      renderFeaturedProducts();
    });
  });
}

function getFilteredProducts() {
  var list = state.products.filter(function (product) {
    var categoryOk = state.activeFilter === 'all' || product.category === state.activeFilter;
    return categoryOk && product.price <= state.maxPrice;
  });
  if (state.sort === 'price-low') list.sort(function (a, b) { return a.price - b.price; });
  if (state.sort === 'price-high') list.sort(function (a, b) { return b.price - a.price; });
  if (state.sort === 'rating') list.sort(function (a, b) { return b.rating - a.rating; });
  return list;
}

function renderFeaturedProducts() {
  var products = getFilteredProducts().slice(0, 8);
  if (!products.length) {
    els.featuredGrid.innerHTML = '<p>No products match the selected filters.</p>';
    return;
  }
  els.featuredGrid.innerHTML = products.map(productCard).join('');
  bindProductActions(els.featuredGrid);
}

function renderDealProducts() {
  var deals = state.products.filter(function (product) { return product.flashSale; }).slice(0, 4);
  els.dealProducts.innerHTML = deals.map(productCard).join('');
  bindProductActions(els.dealProducts);
}

function renderCollectionProducts() {
  var products = state.products.filter(function (product) { return product.tags.includes(state.activeTab); }).slice(0, 10);
  els.collectionGrid.innerHTML = products.map(productCard).join('');
  bindProductActions(els.collectionGrid);
}

function productCard(product) {
  var isWishlisted = state.wishlist.includes(product.id);
  var compareSelected = state.compare.includes(product.id);
  return '<article class="product-card">' +
    '<div class="product-media"><img src="assets/' + escapeHtml(product.image) + '" alt="' + escapeHtml(product.name) + '" loading="lazy"><span class="product-badge">-' + product.discount + '%</span></div>' +
    '<div class="product-body">' +
      '<span class="rating">' + product.rating.toFixed(1) + '/5</span>' +
      '<h3>' + escapeHtml(product.name) + '</h3>' +
      '<p>' + escapeHtml(product.description) + '</p>' +
      '<div class="product-meta"><span class="price">' + money.format(product.price) + '</span><span class="stock">' + product.stock + ' left</span></div>' +
      '<div class="card-actions">' +
        '<button class="cart-add" type="button" data-id="' + product.id + '">Add</button>' +
        '<button type="button" data-wishlist="' + product.id + '" aria-label="Wishlist ' + escapeHtml(product.name) + '">' + (isWishlisted ? 'Saved' : 'Wish') + '</button>' +
        '<button type="button" data-compare="' + product.id + '" aria-label="Compare ' + escapeHtml(product.name) + '">' + (compareSelected ? 'On' : 'Cmp') + '</button>' +
      '</div>' +
    '</div>' +
  '</article>';
}

function bindProductActions(root) {
  root.querySelectorAll('[data-id]').forEach(function (button) { button.addEventListener('click', function () { addToCart(button.dataset.id); }); });
  root.querySelectorAll('[data-wishlist]').forEach(function (button) { button.addEventListener('click', function () { toggleWishlist(button.dataset.wishlist); }); });
  root.querySelectorAll('[data-compare]').forEach(function (button) { button.addEventListener('click', function () { toggleCompare(button.dataset.compare); }); });
}

function addToCart(id) {
  var found = state.cart.find(function (item) { return item.id === id; });
  if (found) found.quantity += 1;
  else state.cart.push({ id: id, quantity: 1 });
  localStorage.setItem('cart', JSON.stringify(state.cart));
  updateCounters();
  toast('Added to cart.');
}

function toggleWishlist(id) {
  state.wishlist = state.wishlist.includes(id) ? state.wishlist.filter(function (item) { return item !== id; }) : state.wishlist.concat(id);
  localStorage.setItem('wishlist', JSON.stringify(state.wishlist));
  updateCounters();
  renderFeaturedProducts();
  renderDealProducts();
  renderCollectionProducts();
  toast('Wishlist updated.');
}

function toggleCompare(id) {
  if (state.compare.includes(id)) state.compare = state.compare.filter(function (item) { return item !== id; });
  else if (state.compare.length < 4) state.compare.push(id);
  else { toast('Compare supports up to 4 products.'); return; }
  localStorage.setItem('compare', JSON.stringify(state.compare));
  renderFeaturedProducts();
  renderDealProducts();
  renderCollectionProducts();
  toast('Compare list updated.');
}

function updateCounters() {
  els.wishlistCount.textContent = String(state.wishlist.length);
  els.cartCount.textContent = String(state.cart.reduce(function (sum, item) { return sum + item.quantity; }, 0));
}

function renderBrands() {
  els.brandStrip.innerHTML = state.brands.map(function (brand) {
    return '<div class="brand-card"><span class="brand-mark">' + escapeHtml(brand.initials) + '</span><strong>' + escapeHtml(brand.name) + '</strong><small>' + escapeHtml(brand.category) + '</small></div>';
  }).join('');
}

function renderReviews() {
  els.reviewList.innerHTML = state.reviews.map(function (review) {
    return '<article class="review-card"><strong>' + escapeHtml(review.name) + '</strong><div class="rating">' + review.rating + '/5</div><p>' + escapeHtml(review.comment) + '</p></article>';
  }).join('');
}

function renderNews() {
  els.newsList.innerHTML = state.news.map(function (item) {
    return '<article class="news-card"><span class="news-thumb">' + escapeHtml(item.initials) + '</span><div><h3>' + escapeHtml(item.title) + '</h3><p>' + escapeHtml(item.summary) + '</p></div></article>';
  }).join('');
}

function renderVideos() {
  els.videoList.innerHTML = state.videos.map(function (item) {
    return '<article class="video-card"><span class="video-thumb">Play</span><div><h3>' + escapeHtml(item.title) + '</h3><p>' + escapeHtml(item.length) + ' tutorial</p></div></article>';
  }).join('');
}

function renderStats() {
  els.statsGrid.innerHTML = state.stats.map(function (stat) {
    return '<div class="stat-card"><strong>' + escapeHtml(stat.value) + '</strong><span>' + escapeHtml(stat.label) + '</span></div>';
  }).join('');
}

function updateAiPick() {
  var recommended = state.products.filter(function (product) { return product.tags.includes('recommended'); }).sort(function (a, b) { return b.rating - a.rating; })[0];
  if (recommended && els.aiPickTitle) els.aiPickTitle.textContent = recommended.name;
}

function updateSuggestions() {
  var query = els.searchInput.value.trim().toLowerCase();
  if (!query) {
    els.searchSuggestions.classList.remove('visible');
    els.searchSuggestions.innerHTML = '';
    return;
  }
  var category = els.categorySelect.value;
  var matches = state.products.filter(function (product) {
    var categoryOk = category === 'all' || product.category === category;
    return categoryOk && (product.name.toLowerCase().includes(query) || product.category.toLowerCase().includes(query) || product.brand.toLowerCase().includes(query));
  }).slice(0, 6);
  els.searchSuggestions.innerHTML = matches.map(function (product) {
    return '<button class="suggestion-item" type="button" data-suggestion="' + escapeHtml(product.name) + '"><img src="assets/' + escapeHtml(product.image) + '" alt=""><span>' + escapeHtml(product.name) + '<small> ' + escapeHtml(product.category) + '</small></span><strong>' + money.format(product.price) + '</strong></button>';
  }).join('');
  els.searchSuggestions.classList.toggle('visible', matches.length > 0);
  els.searchSuggestions.querySelectorAll('[data-suggestion]').forEach(function (button) {
    button.addEventListener('click', function () {
      els.searchInput.value = button.dataset.suggestion;
      els.searchSuggestions.classList.remove('visible');
      submitSearch(new Event('submit'));
    });
  });
}

function submitSearch(event) {
  event.preventDefault();
  var query = els.searchInput.value.trim().toLowerCase();
  if (!query) return;
  var found = state.products.find(function (product) { return product.name.toLowerCase().includes(query); });
  if (found) {
    state.activeFilter = found.category;
    document.querySelectorAll('.filter-chip').forEach(function (chip) { chip.classList.toggle('active', chip.dataset.filter === state.activeFilter); });
    renderFeaturedProducts();
    document.getElementById('featured').scrollIntoView({ behavior: 'smooth', block: 'start' });
    toast('Showing matches for ' + found.category + '.');
  } else {
    toast('No exact match yet. Try another category.');
  }
}

function closeSuggestionsOnOutsideClick(event) {
  if (!els.searchForm.contains(event.target)) els.searchSuggestions.classList.remove('visible');
}

function startVoiceSearch() {
  var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    toast('Voice search is not supported in this browser.');
    return;
  }
  var recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.onresult = function (event) {
    els.searchInput.value = event.results[0][0].transcript;
    updateSuggestions();
    toast('Voice search captured.');
  };
  recognition.start();
}

function copyCouponCode() {
  navigator.clipboard.writeText('INFOTECH15').then(function () { toast('Coupon copied.'); }).catch(function () { toast('Coupon code: INFOTECH15'); });
}

function subscribeNewsletter(event) {
  event.preventDefault();
  localStorage.setItem('newsletterEmail', document.getElementById('newsletterEmail').value);
  event.target.reset();
  toast('Newsletter subscription saved locally.');
}

function startCountdown() {
  var target = Date.now() + 1000 * 60 * 60 * 9;
  var countdown = document.getElementById('dealCountdown');
  function update() {
    var remaining = Math.max(0, target - Date.now());
    var hours = Math.floor(remaining / 3600000);
    var minutes = Math.floor((remaining % 3600000) / 60000);
    var seconds = Math.floor((remaining % 60000) / 1000);
    countdown.textContent = pad(hours) + ':' + pad(minutes) + ':' + pad(seconds);
  }
  update();
  setInterval(update, 1000);
}

function pad(value) { return String(value).padStart(2, '0'); }

function toast(message) {
  var node = document.createElement('div');
  node.className = 'toast';
  node.textContent = message;
  els.toastRegion.appendChild(node);
  setTimeout(function () { node.remove(); }, 3200);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, function (character) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[character];
  });
}
