export interface QueryFilter {
  userId?: string;
  userEmail?: string;
  search?: string;
  industry?: string;
  status?: string;
  hasPhone?: boolean;
  hasEmail?: boolean;
  minRating?: number;
  limit?: number;
  skip?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface IStorageRepository<T> {
  findById(id: string): Promise<T | null>;
  findOne(query: Record<string, any>): Promise<T | null>;
  find(filter?: QueryFilter): Promise<{ items: T[]; total: number }>;
  create(item: Omit<T, "_id">): Promise<T>;
  update(id: string, item: Partial<T>): Promise<T | null>;
  upsert(query: Record<string, any>, item: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
  count(query?: Record<string, any>): Promise<number>;
}

