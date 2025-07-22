class DynamicAccordion extends HTMLElement {
  constructor() {
    super();
    this.allowMultiple = this.dataset.allowMultiple === 'true';
    this.init();
  }

  init() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    const details = this.querySelectorAll('details');
    
    details.forEach(detail => {
      const summary = detail.querySelector('summary');
      if (summary) {
        summary.addEventListener('click', (e) => this.handleToggle(e, detail));
      }
    });
  }

  handleToggle(event, currentDetail) {
    if (!this.allowMultiple) {
      // Close all other details if multiple open is not allowed
      const allDetails = this.querySelectorAll('details');
      allDetails.forEach(detail => {
        if (detail !== currentDetail && detail.open) {
          detail.open = false;
        }
      });
    }
  }
}

customElements.define('dynamic-accordion', DynamicAccordion);