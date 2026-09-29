import { apiClient } from './apiClient';

export interface AuditEventItem {
  _id: string;
  timestamp: string;
  userId?: string;
  userRole?: string;
  actionType: string;
  entityAffected: string;
  identifier: string;
  previousState?: Record<string, any>;
  newState?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  descripcion?: string;
}

export interface QueryAuditParams {
  entityAffected?: string;
  actionType?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const auditService = {
  async getAll(params?: QueryAuditParams): Promise<{
    items: AuditEventItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return apiClient.get<{
      items: AuditEventItem[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>('/audit', params);
  },

  async getSecurityEvents(limit = 10): Promise<AuditEventItem[]> {
    return apiClient.get<AuditEventItem[]>('/audit/security-events', { limit });
  },

  async getById(id: string): Promise<AuditEventItem> {
    return apiClient.get<AuditEventItem>(`/audit/${id}`);
  },
};
