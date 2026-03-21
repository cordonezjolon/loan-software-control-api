export interface PaginatedResult<T> {
  /**
   * Array of data items
   */
  data: T[];
  
  /**
   * Total number of items across all pages
   */
  total: number;
  
  /**
   * Current page number (1-based)
   */
  page: number;
  
  /**
   * Number of items per page
   */
  limit: number;
  
  /**
   * Total number of pages
   */
  totalPages: number;
  
  /**
   * Whether there is a next page
   */
  hasNext?: boolean;
  
  /**
   * Whether there is a previous page
   */
  hasPrev?: boolean;
}