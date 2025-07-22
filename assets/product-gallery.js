if (!customElements.get('product-gallery')) {
  class ProductGallery extends HTMLElement {
    constructor() {
      super();
      this.swiper = null;
      this.allSlides = [];
      this.isInitialized = false;
    }

    connectedCallback() {
      // Add loading state
      const container = this.querySelector('.swiper-container');
      if (container) {
        container.classList.add('swiper-loading');
      }
      
      // Initialize with a small delay to ensure DOM is ready
      setTimeout(() => {
        this.initializeSwiper();
        this.setupVariantFiltering();
        
        // Remove loading state
        if (container) {
          container.classList.remove('swiper-loading');
        }
      }, 100);
    }

    async initializeSwiper() {
      try {
        await this.waitForSwiper();
        
        const swiperContainer = this.querySelector('.swiper-container');
        if (!swiperContainer) {
          throw new Error('Swiper container not found');
        }

        // Get settings from the section (passed via data attributes or global variables)
        const sectionId = swiperContainer.id.replace('product-gallery-swiper-', '');
        const sectionSettings = this.getSectionSettings(sectionId, swiperContainer);

        const swiperConfig = {
          loop: sectionSettings.enableLoop || false,
          slidesPerView: 1,
          spaceBetween: sectionSettings.spaceBetween || 10,
          speed: 400,
          effect: 'slide',
          grabCursor: true,
          watchSlidesProgress: true,
          pagination: {
            el: this.querySelector('.swiper-pagination'),
            clickable: true,
            dynamicBullets: true,
            renderBullet: function (index, className) {
              return '<span class="' + className + '" aria-label="Go to slide ' + (index + 1) + '"></span>';
            }
          },
          navigation: {
            nextEl: this.querySelector('.swiper-button-next'),
            prevEl: this.querySelector('.swiper-button-prev')
          },
          keyboard: {
            enabled: true,
            onlyInViewport: true
          },
          a11y: {
            prevSlideMessage: 'Previous slide',
            nextSlideMessage: 'Next slide',
            paginationBulletMessage: 'Go to slide {{index}}'
          },
          breakpoints: {
            768: {
              slidesPerView: Math.min(2, sectionSettings.slidesPerViewDesktop || 1),
              spaceBetween: (sectionSettings.spaceBetween || 10) * 2
            },
            1024: {
              slidesPerView: sectionSettings.slidesPerViewDesktop || 1,
              spaceBetween: (sectionSettings.spaceBetween || 10) * 3
            }
          },
          on: {
            init: () => {
              console.log('Swiper initialized successfully');
            },
            slideChange: () => {
              // Optional: Add analytics or custom events here
            },
            error: (error) => {
              console.error('Swiper error:', error);
            }
          }
        };

        // Add autoplay if enabled
        if (sectionSettings.enableAutoplay) {
          swiperConfig.autoplay = {
            delay: sectionSettings.autoplayDelay || 3000,
            disableOnInteraction: false,
            pauseOnMouseEnter: true
          };
        }

        this.swiper = new Swiper(swiperContainer, swiperConfig);
        this.allSlides = Array.from(this.querySelectorAll('.swiper-slide'));
        
        // Mark as initialized
        this.setAttribute('data-initialized', 'true');
        this.isInitialized = true;
        
      } catch (error) {
        console.error('Error initializing Swiper:', error);
        this.handleInitializationError(error);
      }
    }

    waitForSwiper() {
      return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds timeout
        
        const checkSwiper = () => {
          attempts++;
          
          if (window.Swiper || typeof Swiper !== 'undefined') {
            resolve();
          } else if (attempts >= maxAttempts) {
            reject(new Error('Swiper library failed to load'));
          } else {
            setTimeout(checkSwiper, 100);
          }
        };
        
        checkSwiper();
      });
    }

    handleInitializationError(error) {
      const container = this.querySelector('.swiper-container');
      if (container) {
        container.classList.remove('swiper-loading');
        container.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center; height: 300px; background: #f8f9fa; border-radius: 8px; color: #6c757d; text-align: center; padding: 20px;">
            <div>
              <p style="margin: 0 0 10px 0; font-size: 16px;">Gallery temporarily unavailable</p>
              <p style="margin: 0; font-size: 14px;">Please refresh the page or try again later.</p>
            </div>
          </div>
        `;
      }
    }

    setupVariantFiltering() {
      // Use event delegation to handle dynamic DOM updates
      this.handleVariantChange = this.handleVariantChange.bind(this);
      document.addEventListener('change', this.handleVariantChange);
      
      // Listen for Shopify's variant selection events
      if (window.subscribe && window.PUB_SUB_EVENTS) {
        this.handleVariantSelectionChange = this.handleVariantSelectionChange.bind(this);
        window.subscribe(window.PUB_SUB_EVENTS.optionValueSelectionChange, this.handleVariantSelectionChange);
      }
      
      // Also listen for custom color filter events
      this.handleCustomColorFilter = (event) => {
        if (event.detail && event.detail.color) {
          this.filterSlidesByColor(event.detail.color);
        }
      };
      document.addEventListener('product:colorFilter', this.handleCustomColorFilter);
    }

    handleVariantChange(event) {
      if (!this.isInitialized || !this.swiper) return;
      
      const target = event.target;
      
      // Only handle variant selector changes
      const variantSelects = target.closest('variant-selects');
      if (!variantSelects) return;
      
      let selectedValue = null;
      
      // Handle radio buttons (swatch/button picker)
      if (target.type === 'radio' && target.checked) {
        selectedValue = target.value.toLowerCase();
      }
      // Handle select dropdowns
      else if (target.tagName === 'SELECT') {
        selectedValue = target.value.toLowerCase();
      }
      
      if (selectedValue) {
        // Check if this is a color option by looking at the option name
        const optionContainer = target.closest('.product-form__input');
        const optionLabel = optionContainer?.querySelector('.form__label');
        const optionName = optionLabel?.textContent?.toLowerCase() || '';
        
        // Only filter if this is a color-related option
        if (this.isColorOption(optionName)) {
          this.filterSlidesByColor(selectedValue);
        }
      }
    }

    handleVariantSelectionChange(event) {
      if (!this.isInitialized || !this.swiper) return;
      
      const { target } = event.data;
      
      if (target && target.value) {
        const optionContainer = target.closest('.product-form__input');
        const optionLabel = optionContainer?.querySelector('.form__label');
        const optionName = optionLabel?.textContent?.toLowerCase() || '';
        
        // Only filter if this is a color-related option
        if (this.isColorOption(optionName)) {
          this.filterSlidesByColor(target.value.toLowerCase());
        }
      }
    }

    filterSlidesByColor(selectedColor) {
      if (!this.swiper || !this.allSlides) return;

      let visibleSlides = [];
      let hasVisibleSlides = false;
      
      this.allSlides.forEach((slide, index) => {
        const slideColor = slide.dataset.color || '';
        const shouldShow = !selectedColor || this.colorMatches(slideColor, selectedColor);

        console.log(slideColor, selectedColor, shouldShow);
        
        if (shouldShow) {
          slide.classList.remove('swiper-slide-hidden');
          slide.style.display = 'flex';
          visibleSlides.push(index);
          hasVisibleSlides = true;
        } else {
          slide.classList.add('swiper-slide-hidden');
          slide.style.display = 'none';
        }
      });

      // Update Swiper after filtering
      if (hasVisibleSlides) {
        this.swiper.update();
        // Slide to first visible slide
        if (visibleSlides.length > 0) {
          this.swiper.slideTo(0, 300);
        }
      } else {
        // If no slides match, show all slides
        this.showAllSlides();
      }
    }

    colorMatches(slideColor, selectedColor) {
      if (!slideColor || !selectedColor) return true;
      
      const normalizedSlideColor = slideColor.toLowerCase().trim();
      const normalizedSelectedColor = selectedColor.toLowerCase().trim();
      
      // Exact match
      if (normalizedSlideColor === normalizedSelectedColor) return true;
      
      // Partial match (slide color contains selected color)
      if (normalizedSlideColor.includes(normalizedSelectedColor)) return true;
      
      return false;
    }

    isColorOption(optionName) {
      const colorKeywords = ['color', 'colour'];
      return colorKeywords.some(keyword => optionName.includes(keyword));
    }

    showAllSlides() {
      if (!this.allSlides) return;
      
      this.allSlides.forEach(slide => {
        slide.classList.remove('swiper-slide-hidden');
        slide.style.display = 'flex';
      });
      
      if (this.swiper) {
        this.swiper.update();
        this.swiper.slideTo(0, 300);
      }
    }

    getSectionSettings(sectionId, container) {
      // Try to get settings from window.sectionSettings or data attributes
      const settings = {
        enableLoop: false,
        enableAutoplay: false,
        autoplayDelay: 3000,
        slidesPerViewDesktop: 1,
        spaceBetween: 10
      };

      // Check for global section settings first
      if (window.sectionSettings && window.sectionSettings[sectionId]) {
        const sectionData = window.sectionSettings[sectionId];
        settings.enableLoop = sectionData.enable_swiper_loop || false;
        settings.enableAutoplay = sectionData.enable_swiper_autoplay || false;
        settings.autoplayDelay = sectionData.swiper_autoplay_delay || 3000;
        settings.slidesPerViewDesktop = sectionData.swiper_slides_per_view_desktop || 1;
        settings.spaceBetween = sectionData.swiper_space_between || 10;
      } else if (container) {
        // Fallback to data attributes
        settings.enableLoop = container.dataset.enableLoop === 'true';
        settings.enableAutoplay = container.dataset.enableAutoplay === 'true';
        settings.autoplayDelay = parseInt(container.dataset.autoplayDelay) || 3000;
        settings.slidesPerViewDesktop = parseInt(container.dataset.slidesPerView) || 1;
        settings.spaceBetween = parseInt(container.dataset.spaceBetween) || 10;
      }

      return settings;
    }

    disconnectedCallback() {
      // Clean up Swiper instance
      if (this.swiper) {
        this.swiper.destroy(true, true);
        this.swiper = null;
      }
      
      // Remove event listeners
      if (this.handleVariantChange) {
        document.removeEventListener('change', this.handleVariantChange);
      }
      
      // Remove Shopify PUB_SUB event listeners
      if (window.unsubscribe && window.PUB_SUB_EVENTS && this.handleVariantSelectionChange) {
        window.unsubscribe(window.PUB_SUB_EVENTS.optionValueSelectionChange, this.handleVariantSelectionChange);
      }
      
      // Remove custom event listeners
      if (this.handleCustomColorFilter) {
        document.removeEventListener('product:colorFilter', this.handleCustomColorFilter);
      }
      
      // Clear references
      this.allSlides = null;
      this.handleVariantChange = null;
      this.handleVariantSelectionChange = null;
      this.handleCustomColorFilter = null;
    }
  }

  customElements.define('product-gallery', ProductGallery);
}