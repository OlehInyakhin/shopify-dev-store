class LookbookModal {
  constructor() {
    this.modal = document.getElementById('lookbook-modal');
    this.modalImage = this.modal?.querySelector('.lookbook-modal__image');
    this.modalProductsContainer = this.modal?.querySelector('.lookbook-modal__products');
    this.triggers = document.querySelectorAll('[data-lookbook-trigger]');
    this.closeButtons = this.modal?.querySelectorAll('[data-lookbook-close]');
    
    this.init();
  }
  
  init() {
    if (!this.modal) return;
    
    // Bind event listeners
    this.bindEvents();
    
    // Handle escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) {
        this.close();
      }
    });
  }
  
  bindEvents() {
    // Open modal triggers
    this.triggers.forEach(trigger => {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        this.open(trigger);
      });
    });
    
    // Close modal triggers
    this.closeButtons?.forEach(closeBtn => {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.close();
      });
    });
    

  }
  
  open(trigger) {
    if (!this.modal || !trigger) return;
    
    // Get data from trigger
    const imageUrl = trigger.dataset.lookbookImage;
    const productsData = trigger.dataset.lookbookProducts;
    
    // Set modal image
    if (this.modalImage && imageUrl) {
      this.modalImage.src = imageUrl;
      this.modalImage.alt = 'Lookbook Style';
    }
    
    // Populate products
    this.populateProducts(productsData);
    
    // Show modal
    this.modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    
    // Focus management
    this.trapFocus();
    
    // Dispatch custom event
    this.dispatchEvent('lookbook:open', { trigger, modal: this.modal });
  }
  
  close() {
    if (!this.modal) return;
    
    this.modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    
    // Dispatch custom event
    this.dispatchEvent('lookbook:close', { modal: this.modal });
  }
  
  isOpen() {
    return this.modal?.getAttribute('aria-hidden') === 'false';
  }
  
  populateProducts(productsData) {
    if (!this.modalProductsContainer || !productsData) return;
    
    try {
      const products = JSON.parse(productsData);
      
      this.modalProductsContainer.innerHTML = products.map(product => {
        return this.createProductHTML(product);
      }).join('');
      
      // Dispatch event for variant selector initialization
      this.dispatchEvent('lookbook:products-loaded', {
        modal: this.modal,
        products: products
      });
      
    } catch (error) {
      console.error('Error parsing products data:', error);
      this.modalProductsContainer.innerHTML = '<p>Unable to load products.</p>';
    }
  }
  
  createProductHTML(product) {
    const uniqueId = `lookbook-product-${product.id}`;
    const currentVariant = product.variants[0];
    const price = this.formatPrice(currentVariant.price);
    const compareAtPrice = currentVariant.compare_at_price ? this.formatPrice(currentVariant.compare_at_price) : null;
    const isOnSale = compareAtPrice && currentVariant.compare_at_price > currentVariant.price;
    
    return `
      <div class="lookbook-modal__product" data-product-id="${product.id}">
        <div class="lookbook-modal__product-image">
          <img src="${product.image || ''}" alt="${this.escapeHtml(product.title)}" loading="lazy" data-product-image>
        </div>
        <div class="lookbook-modal__product-info">
          <h4 class="lookbook-modal__product-title h4">
            <a href="${product.url}" target="_blank">${this.escapeHtml(product.title)}</a>
          </h4>
          
          ${this.createVariantSelectorHTML(product, uniqueId)}
          
          <div class="lookbook-modal__product-actions">
            <button 
              type="button"
              class="button button--primary button--small product-add-to-cart"
              data-add-to-cart
              data-product-id="${product.id}"
              data-variant-id="${currentVariant.id}"
              ${!currentVariant.available ? 'disabled' : ''}
            >
              <span class="add-to-cart-text">
                ${currentVariant.available ? `Add to Cart - ${price}` : 'Sold Out'}
              </span>
              <span class="add-to-cart-loading hidden">
                <svg class="spinner" width="16" height="16" viewBox="0 0 16 16">
                  <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="31.416" stroke-dashoffset="31.416">
                    <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
                    <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
                  </circle>
                </svg>
                Adding...
              </span>
            </button>
          </div>
        </div>
      </div>
    `;
  }
  
  createVariantSelectorHTML(product, uniqueId) {
    if (product.has_only_default_variant) {
      const variant = product.variants[0];
      const price = this.formatPrice(variant.price);
      const compareAtPrice = variant.compare_at_price ? this.formatPrice(variant.compare_at_price) : null;
      const isOnSale = compareAtPrice && variant.compare_at_price > variant.price;
      
      return `
        <div class="lookbook-modal__product-price">
          ${isOnSale ? `<span class="price-item price-item--sale">${price}</span>` : `<span class="price-item">${price}</span>`}
          ${isOnSale ? `<span class="price-item price-item--regular">${compareAtPrice}</span>` : ''}
        </div>
        <div class="lookbook-modal__product-stock">
          ${this.getStockStatusHTML(variant)}
        </div>
      `;
    }
    
    return `
      <div class="product-variant-selector" data-product-id="${product.id}">
        ${product.options.map((option, index) => this.createOptionHTML(product, option, index, uniqueId)).join('')}
        <div class="lookbook-modal__product-price" data-price-container>
          <span class="price-item" data-current-price>${this.formatPrice(product.variants[0].price)}</span>
          ${product.variants[0].compare_at_price ? `<span class="price-item price-item--regular" data-compare-price>${this.formatPrice(product.variants[0].compare_at_price)}</span>` : ''}
        </div>
        <div class="lookbook-modal__product-stock" data-stock-container>
          ${this.getStockStatusHTML(product.variants[0])}
        </div>
      </div>
    `;
  }
  
  createOptionHTML(product, option, optionIndex, uniqueId) {
    const isColorOption = option.toLowerCase().includes('color') || option.toLowerCase().includes('colour');
    
    if (isColorOption) {
      return this.createColorSwatchesHTML(product, option, optionIndex, uniqueId);
    } else {
      return this.createSelectHTML(product, option, optionIndex, uniqueId);
    }
  }
  
  createColorSwatchesHTML(product, option, optionIndex, uniqueId) {
    const optionValues = [...new Set(product.variants.map(v => v[`option${optionIndex + 1}`]).filter(Boolean))];
    
    return `
      <div class="variant-option">
        <label class="variant-option__label">${option}</label>
        <div class="variant-swatches">
          ${optionValues.map((value, valueIndex) => {
            const isAvailable = product.variants.some(v => v[`option${optionIndex + 1}`] === value && v.available);
            return `
              <input 
                type="radio" 
                id="${uniqueId}-option-${optionIndex}-${valueIndex}"
                name="${uniqueId}-option-${optionIndex}"
                value="${this.escapeHtml(value)}"
                class="variant-swatch__input"
                ${valueIndex === 0 ? 'checked' : ''}
                ${!isAvailable ? 'disabled' : ''}
                data-option-index="${optionIndex}"
              >
              <label 
                class="variant-swatch ${!isAvailable ? 'variant-swatch--disabled' : ''}"
                for="${uniqueId}-option-${optionIndex}-${valueIndex}"
                title="${this.escapeHtml(value)}"
                style="background-color: ${value.toLowerCase().replace(/\s+/g, '')};"
              >
                <span class="visually-hidden">${this.escapeHtml(value)}</span>
              </label>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }
  
  createSelectHTML(product, option, optionIndex, uniqueId) {
    const optionValues = [...new Set(product.variants.map(v => v[`option${optionIndex + 1}`]).filter(Boolean))];
    
    return `
      <div class="variant-option">
        <label class="variant-option__label" for="${uniqueId}-select-${optionIndex}">${option}</label>
        <select 
          class="variant-select"
          id="${uniqueId}-select-${optionIndex}"
          data-option-index="${optionIndex}"
        >
          ${optionValues.map(value => {
            const isAvailable = product.variants.some(v => v[`option${optionIndex + 1}`] === value && v.available);
            return `
              <option 
                value="${this.escapeHtml(value)}"
                ${!isAvailable ? 'disabled' : ''}
              >
                ${this.escapeHtml(value)}${!isAvailable ? ' - Sold out' : ''}
              </option>
            `;
          }).join('')}
        </select>
      </div>
    `;
  }
  
  getStockStatusHTML(variant) {
    if (!variant.available) {
      return '<span class="stock-status stock-status--out-of-stock">Sold out</span>';
    }
    
    if (variant.inventory_management === 'shopify') {
      if (variant.inventory_quantity <= 5 && variant.inventory_quantity > 0) {
        return `<span class="stock-status stock-status--low">Only ${variant.inventory_quantity} left!</span>`;
      } else if (variant.inventory_quantity > 5) {
        return '<span class="stock-status stock-status--in-stock">In stock</span>';
      }
    }
    
    return '<span class="stock-status stock-status--in-stock">Available</span>';
  }

  formatPrice(price) {
    // Convert cents to dollars and format
    const dollars = (price / 100).toFixed(2);
    return `$${dollars}`;
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  trapFocus() {
    if (!this.modal) return;
    
    const focusableElements = this.modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    // Focus first element
    firstElement?.focus();
    
    // Handle tab navigation
    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };
    
    // Remove existing listener and add new one
    this.modal.removeEventListener('keydown', handleTabKey);
    this.modal.addEventListener('keydown', handleTabKey);
  }
  
  dispatchEvent(eventName, detail) {
    const event = new CustomEvent(eventName, {
      detail,
      bubbles: true,
      cancelable: true
    });
    
    document.dispatchEvent(event);
  }
}

// Class for handling variant selection and price updates
class VariantSelector {
  constructor(productContainer) {
    this.productContainer = productContainer;
    this.product = null;
    this.selectedOptions = {};
    this.currentVariant = null;
    
    this.init();
  }
  
  init() {
    this.bindEvents();
  }
  
  bindEvents() {
    // Handle color swatch selection
    this.productContainer.addEventListener('change', (e) => {
      if (e.target.matches('.variant-swatch__input')) {
        this.handleOptionChange(e.target);
      }
    });
    
    // Handle dropdown selection
    this.productContainer.addEventListener('change', (e) => {
      if (e.target.matches('.variant-select')) {
        this.handleOptionChange(e.target);
      }
    });
  }
  
  setProduct(product) {
    this.product = product;
    this.initializeSelectedOptions();
    this.updateCurrentVariant();
  }
  
  initializeSelectedOptions() {
    if (!this.product) return;
    
    // Initialize with first available variant options
    const firstVariant = this.product.variants.find(v => v.available) || this.product.variants[0];
    
    this.selectedOptions = {
      option1: firstVariant.option1,
      option2: firstVariant.option2,
      option3: firstVariant.option3
    };
  }
  
  handleOptionChange(input) {
    const optionIndex = parseInt(input.dataset.optionIndex);
    const optionKey = `option${optionIndex + 1}`;
    
    this.selectedOptions[optionKey] = input.value;
    this.updateCurrentVariant();
    this.updateUI();
  }
  
  updateCurrentVariant() {
    if (!this.product) return;
    
    this.currentVariant = this.product.variants.find(variant => {
      return variant.option1 === this.selectedOptions.option1 &&
             variant.option2 === this.selectedOptions.option2 &&
             variant.option3 === this.selectedOptions.option3;
    });
    
    if (!this.currentVariant) {
      this.currentVariant = this.product.variants[0];
    }
  }
  
  updateUI() {
    this.updatePrice();
    this.updateStock();
    this.updateAddToCartButton();
    this.updateAvailableOptions();
  }
  
  updatePrice() {
    const priceContainer = this.productContainer.querySelector('[data-price-container]');
    if (!priceContainer || !this.currentVariant) return;
    
    const currentPriceEl = priceContainer.querySelector('[data-current-price]');
    const comparePriceEl = priceContainer.querySelector('[data-compare-price]');
    
    if (currentPriceEl) {
      currentPriceEl.textContent = this.formatPrice(this.currentVariant.price);
    }
    
    if (this.currentVariant.compare_at_price && this.currentVariant.compare_at_price > this.currentVariant.price) {
      if (comparePriceEl) {
        comparePriceEl.textContent = this.formatPrice(this.currentVariant.compare_at_price);
        comparePriceEl.style.display = '';
      }
      currentPriceEl?.classList.add('price-item--sale');
    } else {
      if (comparePriceEl) {
        comparePriceEl.style.display = 'none';
      }
      currentPriceEl?.classList.remove('price-item--sale');
    }
  }
  
  updateStock() {
    const stockContainer = this.productContainer.querySelector('[data-stock-container]');
    if (!stockContainer || !this.currentVariant) return;
    
    stockContainer.innerHTML = this.getStockStatusHTML(this.currentVariant);
  }
  
  updateAddToCartButton() {
    const addButton = this.productContainer.querySelector('[data-add-to-cart]');
    if (!addButton || !this.currentVariant) return;
    
    const textSpan = addButton.querySelector('.add-to-cart-text');
    const price = this.formatPrice(this.currentVariant.price);
    
    if (this.currentVariant.available) {
      addButton.disabled = false;
      addButton.classList.remove('disabled');
      if (textSpan) {
        textSpan.textContent = `Add to Cart - ${price}`;
      }
    } else {
      addButton.disabled = true;
      addButton.classList.add('disabled');
      if (textSpan) {
        textSpan.textContent = 'Sold Out';
      }
    }
    
    // Update data attributes
    addButton.dataset.variantId = this.currentVariant.id;
  }
  
  updateAvailableOptions() {
    if (!this.product) return;
    
    // Update available options based on current selection
    this.product.options.forEach((option, optionIndex) => {
      const optionKey = `option${optionIndex + 1}`;
      const inputs = this.productContainer.querySelectorAll(`[data-option-index="${optionIndex}"]`);
      
      inputs.forEach(input => {
        const value = input.value || input.textContent;
        const testOptions = { ...this.selectedOptions };
        testOptions[optionKey] = value;
        
        const isAvailable = this.product.variants.some(variant => {
          return variant.option1 === testOptions.option1 &&
                 variant.option2 === testOptions.option2 &&
                 variant.option3 === testOptions.option3 &&
                 variant.available;
        });
        
        if (input.tagName === 'INPUT') {
          input.disabled = !isAvailable;
          const label = this.productContainer.querySelector(`label[for="${input.id}"]`);
          if (label) {
            label.classList.toggle('variant-swatch--disabled', !isAvailable);
          }
        } else if (input.tagName === 'OPTION') {
          input.disabled = !isAvailable;
        }
      });
    });
  }
  
  formatPrice(price) {
    const dollars = (price / 100).toFixed(2);
    return `$${dollars}`;
  }
  
  getStockStatusHTML(variant) {
    if (!variant.available) {
      return '<span class="stock-status stock-status--out-of-stock">Sold out</span>';
    }
    
    if (variant.inventory_management === 'shopify') {
      if (variant.inventory_quantity <= 5 && variant.inventory_quantity > 0) {
        return `<span class="stock-status stock-status--low">Only ${variant.inventory_quantity} left!</span>`;
      } else if (variant.inventory_quantity > 5) {
        return '<span class="stock-status stock-status--in-stock">In stock</span>';
      }
    }
    
    return '<span class="stock-status stock-status--in-stock">Available</span>';
  }
  
  getCurrentVariant() {
    return this.currentVariant;
  }
}

// Class for handling AJAX cart operations
class AjaxCart {
  constructor() {
    this.isLoading = false;
  }
  
  async addToCart(variantId, quantity = 1, properties = {}) {
    if (this.isLoading) return;
    
    this.isLoading = true;
    
    try {
      const response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          id: variantId,
          quantity: quantity,
          properties: properties
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || data.description || 'Failed to add to cart');
      }
      
      // Update cart count
      await this.updateCartCount();
      
      // Dispatch success event
      this.dispatchCartEvent('cart:item-added', {
        variant_id: variantId,
        quantity: quantity,
        item: data
      });
      
      return data;
      
    } catch (error) {
      // Dispatch error event
      this.dispatchCartEvent('cart:error', {
        error: error.message,
        variant_id: variantId
      });
      
      throw error;
    } finally {
      this.isLoading = false;
    }
  }
  
  async addMultipleToCart(items) {
    if (this.isLoading) return;
    
    this.isLoading = true;
    
    try {
      const response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          items: items
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || data.description || 'Failed to add items to cart');
      }
      
      // Update cart count
      await this.updateCartCount();
      
      // Dispatch success event
      this.dispatchCartEvent('cart:items-added', {
        items: items,
        response: data
      });
      
      return data;
      
    } catch (error) {
      // Dispatch error event
      this.dispatchCartEvent('cart:error', {
        error: error.message,
        items: items
      });
      
      throw error;
    } finally {
      this.isLoading = false;
    }
  }
  
  async updateCartCount() {
    try {
      const response = await fetch('/cart.js');
      const cart = await response.json();
      
      // Update cart count in header
      const cartCountElements = document.querySelectorAll('[data-cart-count]');
      cartCountElements.forEach(el => {
        el.textContent = cart.item_count;
      });
      
      // Dispatch cart updated event
      this.dispatchCartEvent('cart:updated', { cart });
      
    } catch (error) {
      console.error('Failed to update cart count:', error);
    }
  }
  
  dispatchCartEvent(eventName, detail) {
    const event = new CustomEvent(eventName, {
      detail: detail,
      bubbles: true
    });
    document.dispatchEvent(event);
  }
  
  isAddingToCart() {
    return this.isLoading;
  }
}

// Utility functions for theme integration
class LookbookUtils {
  static formatMoney(cents, format = '${{amount}}') {
    if (typeof cents !== 'number') {
      return cents;
    }
    
    const value = (cents / 100).toFixed(2);
    return format.replace('{{amount}}', value);
  }
  
  static debounce(func, wait, immediate) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        timeout = null;
        if (!immediate) func(...args);
      };
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func(...args);
    };
  }
  
  static throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initializeLookbook();
  });
} else {
  initializeLookbook();
}

// Initialize lookbook modal and related functionality
function initializeLookbook() {
  // Initialize modal
  window.lookbookModal = new LookbookModal();
  
  // Initialize AJAX cart
  window.ajaxCart = new AjaxCart();
  
  // Store variant selectors for each product
  window.variantSelectors = new Map();
  
  // Handle individual "Add to Cart" buttons
  document.addEventListener('click', async function(e) {
    console.log(e)
    if (e.target.matches('.product-add-to-cart, .product-add-to-cart *')) {
      e.preventDefault();
      
      const button = e.target.closest('.product-add-to-cart');
      if (!button || button.disabled) return;
      
      const productContainer = button.closest('.lookbook-modal__product');
      const productId = productContainer.dataset.productId;
      const variantSelector = window.variantSelectors.get(productId);
      
      if (!variantSelector) {
        console.error('Variant selector not found for product:', productId);
        return;
      }
      
      const currentVariant = variantSelector.getCurrentVariant();
      if (!currentVariant || !currentVariant.available) {
        return;
      }
      
      // Show loading state
      button.classList.add('loading');
      button.disabled = true;
      const loadingSpan = button.querySelector('.add-to-cart-loading');
      const textSpan = button.querySelector('.add-to-cart-text');
      
      if (loadingSpan) loadingSpan.classList.remove('hidden');
      if (textSpan) textSpan.classList.add('hidden');
      
      try {
        await window.ajaxCart.addToCart(currentVariant.id, 1);
        
        // Update cart count in header
        await window.ajaxCart.updateCartCount();
        
        // Show success notification
        showNotification('Product added to cart!', 'success');
        
      } catch (error) {
        console.error('Failed to add to cart:', error);
        showNotification(error.message || 'Failed to add to cart', 'error');
      } finally {
        // Reset button state
        button.classList.remove('loading');
        if (loadingSpan) loadingSpan.classList.add('hidden');
        if (textSpan) textSpan.classList.remove('hidden');
        
        if (currentVariant.available) {
          button.disabled = false;
        }
      }
    }
  });
  

  
  // Initialize variant selectors when modal content is populated
  document.addEventListener('lookbook:products-loaded', function(e) {
    const modal = e.detail.modal;
    const products = e.detail.products;
    
    // Clear existing selectors
    window.variantSelectors.clear();
    
    // Initialize variant selector for each product
    products.forEach(product => {
      const productContainer = modal.querySelector(`[data-product-id="${product.id}"]`);
      if (productContainer) {
        const variantSelector = new VariantSelector(productContainer);
        variantSelector.setProduct(product);
        window.variantSelectors.set(product.id.toString(), variantSelector);
      }
    });
  });
}

// Notification system
function showNotification(message, type = 'info') {
  // Create notification container if it doesn't exist
  let container = document.getElementById('cart-notifications');
  if (!container) {
    container = document.createElement('div');
    container.id = 'cart-notifications';
    container.className = 'cart-notifications';
    document.body.appendChild(container);
  }
  
  const notification = document.createElement('div');
  notification.className = `cart-notification cart-notification--${type}`;
  notification.innerHTML = `
    <div class="cart-notification__content">
      <span class="cart-notification__message">${message}</span>
      <button class="cart-notification__close" aria-label="Close notification">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
  `;
  
  // Add close functionality
  const closeBtn = notification.querySelector('.cart-notification__close');
  closeBtn.addEventListener('click', () => {
    notification.remove();
  });
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 5000);
  
  container.appendChild(notification);
  
  // Trigger animation
  requestAnimationFrame(() => {
    notification.classList.add('cart-notification--show');
  });
}

// Handle dynamic content loading (for AJAX cart, quick shop, etc.)
document.addEventListener('shopify:section:load', () => {
  initializeLookbook();
});

// Export for potential external use
if (typeof window !== 'undefined') {
  window.LookbookModal = LookbookModal;
  window.LookbookUtils = LookbookUtils;
}

// Theme editor support
if (Shopify && Shopify.designMode) {
  document.addEventListener('shopify:section:select', (event) => {
    if (event.target.classList.contains('lookbook-section')) {
      // Handle section selection in theme editor
      console.log('Lookbook section selected in theme editor');
    }
  });
  
  document.addEventListener('shopify:section:deselect', (event) => {
    if (event.target.classList.contains('lookbook-section')) {
      // Handle section deselection in theme editor
      const modal = document.getElementById('lookbook-modal');
      if (modal && modal.getAttribute('aria-hidden') === 'false') {
        const lookbookModal = new LookbookModal();
        lookbookModal.close();
      }
    }
  });
  
  document.addEventListener('shopify:block:select', (event) => {
    // Handle block selection if needed
  });
}