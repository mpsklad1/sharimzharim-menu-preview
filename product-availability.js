// Use the existing audited, version-checked product save endpoint.
export function isProductEnabled(product) {
  return product.status === 'active';
}

export function availabilityUpdate(entry, enabled) {
  return {
    id: entry.product.id,
    version: entry.version,
    product: {...entry.product, status: enabled ? 'active' : 'out'}
  };
}

export class ProductAvailability {
  constructor(account) {
    this.account = account;
    this.pending = new Map();
  }

  set(entry, enabled) {
    const id = entry.product.id;
    if (this.pending.has(id)) return this.pending.get(id).promise;
    const job = {enabled, promise: null};
    this.pending.set(id, job);
    job.promise = Promise.resolve()
      .then(() => this.account.request('/manage/products', 'POST', availabilityUpdate(entry, enabled)))
      .finally(() => this.pending.delete(id));
    return job.promise;
  }
}
