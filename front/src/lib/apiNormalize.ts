export const normalizeApiItem = (item: any): any => {
  if (Array.isArray(item)) {
    return item.map(normalizeApiItem);
  }

  if (item && typeof item === "object") {
    const normalized: any = {};
    Object.keys(item).forEach((key) => {
      const normalizedKey = key.charAt(0).toLowerCase() + key.slice(1);
      normalized[normalizedKey] = normalizeApiItem(item[key]);
    });
    return normalized;
  }

  return item;
};
