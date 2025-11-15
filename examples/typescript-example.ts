// TypeScript example

interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
}

interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
}

// Simple function
function createUser(name: string, email: string): User {
  return {
    id: Math.random(),
    name,
    email,
    role: 'user',
  };
}

// Moderate complexity
function filterProducts(
  products: Product[],
  minPrice?: number,
  maxPrice?: number,
  inStock?: boolean
): Product[] {
  return products.filter(product => {
    if (minPrice && product.price < minPrice) {
      return false;
    }

    if (maxPrice && product.price > maxPrice) {
      return false;
    }

    if (inStock !== undefined && (product.stock > 0) !== inStock) {
      return false;
    }

    return true;
  });
}

// Higher complexity with generics
function processData<T>(
  data: T[],
  validator: (item: T) => boolean,
  transformer: (item: T) => T,
  errorHandler?: (error: Error) => void
): T[] {
  const result: T[] = [];

  for (const item of data) {
    try {
      if (validator(item)) {
        const transformed = transformer(item);
        result.push(transformed);
      } else {
        if (errorHandler) {
          errorHandler(new Error('Validation failed'));
        }
      }
    } catch (error) {
      if (errorHandler && error instanceof Error) {
        errorHandler(error);
      }
    }
  }

  return result;
}

export { createUser, filterProducts, processData, User, Product };
