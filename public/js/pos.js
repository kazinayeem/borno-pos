function pos(config) {
  return {
    products: config.products,
    customers: config.customers,
    category: 'all',
    brand: 'all',
    query: '',
    view: 'grid',
    cart: [],
    customerId: '',
    discount: '0.00',
    coupon: '',
    method: 'Cash',
    tendered: '',
    note: '',
    filtered() {
      return this.products.filter((product) => {
        const q = this.query.toLowerCase();
        const matches = !q || product.name.toLowerCase().includes(q) || product.code.toLowerCase().includes(q);
        return matches && (this.category === 'all' || product.category_id === this.category) && (this.brand === 'all' || product.brand_id === this.brand);
      });
    },
    add(product) {
      if (product.stock < 1) return;
      const line = this.cart.find((item) => item.product_id === product.id);
      if (line) {
        if (line.qty < product.stock) line.qty++;
        return;
      }
      this.cart.push({ product_id: product.id, name: product.name, code: product.code, price: product.price, stock: product.stock, qty: 1, tax_bps: product.tax_bps || 0 });
    },
    money(cents) {
      return config.symbol + ' ' + (cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },
    subtotal() { return this.cart.reduce((sum, line) => sum + line.price * line.qty, 0); },
    discountCents() { return Math.round((parseFloat(this.discount || '0') || 0) * 100); },
    tax() { return this.cart.reduce((sum, line) => sum + Math.floor(line.price * line.qty * (line.tax_bps || 0) / 10000), 0); },
    grand() { return Math.max(0, this.subtotal() - this.discountCents() + this.tax()); },
    change() {
      const tendered = Math.round((parseFloat(this.tendered || '0') || 0) * 100);
      return this.method === 'Cash' ? tendered - this.grand() : 0;
    },
    paidValue() {
      if (this.method !== 'Cash') return (this.grand() / 100).toFixed(2);
      const tendered = parseFloat(this.tendered || '0') || 0;
      return Math.min(tendered, this.grand() / 100).toFixed(2);
    }
  };
}
