// shared/src/types/common.types.ts
export interface BaseEntity {
    id: number;
    guid: number;
    created_at: string;
    updated_at: string;
}

export interface ApiResponse<T = any> {
    data?: T;
    error?: ApiError;
    success: boolean;
}

export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
}

export interface PaginationOptions {
    offset?: number;
    limit?: number;
}

export interface PaginationMeta {
    offset: number;
    limit: number;
    count: number;
    total?: number;
}

export interface PaginatedResponse<T> {
    items: T[];
    pagination: PaginationMeta;
    revision?: string;
}

export interface RequestContext {
    userId?: number;
    userRole?: string;
    requestId?: string;
    timestamp?: string;
}

export interface DatabaseEntity {
    id?: number;
    guid?: number;
    created_at?: string;
    updated_at?: string;
}

export type EntityStatus = 'active' | 'inactive' | 'deleted';

export interface StatusEntity extends DatabaseEntity {
    active: boolean;
}