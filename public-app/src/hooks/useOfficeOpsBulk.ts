import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';

export type BulkOperationType =
  | 'issue_monthly_charges'
  | 'create_management_fee_incomes'
  | 'export_debt_report';

export type BulkJobStatus =
  | 'draft'
  | 'previewed'
  | 'running'
  | 'completed'
  | 'partial'
  | 'failed'
  | 'cancelled';

export interface BulkJobCounts {
  total_items: number;
  validated: number;
  executed: number;
  failed: number;
  skipped: number;
}

export interface BulkJobItem {
  id: string;
  building: number | null;
  building_name: string | null;
  entity_type: string;
  entity_id: string;
  status: string;
  amount: number;
  validation_errors: string[];
  result: Record<string, unknown>;
  retry_count: number;
}

export interface BulkJob {
  id: string;
  operation_type: BulkOperationType;
  status: BulkJobStatus;
  building: number | null;
  building_name: string | null;
  month: string;
  dry_run_completed: boolean;
  summary: Record<string, unknown>;
  idempotency_key: string;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  finished_at: string | null;
  counts: BulkJobCounts;
  items?: BulkJobItem[];
}

interface BulkJobsListResponse {
  results?: BulkJob[];
}

export interface CreateBulkJobPayload {
  operation_type: BulkOperationType;
  building_id?: number;
  month?: string;
  options?: Record<string, unknown>;
  template_id?: number;
  auto_dry_run?: boolean;
  idempotency_key?: string;
}

export function useOfficeBulkJobs() {
  return useQuery<BulkJob[]>({
    queryKey: ['office-ops', 'bulk-jobs'],
    queryFn: async () => {
      const response = await api.get('/office-ops/bulk/jobs/?ordering=-created_at&page_size=20');
      const typed = response as BulkJobsListResponse | BulkJob[];
      if (Array.isArray(typed)) return typed;
      return typed.results || [];
    },
    staleTime: 30 * 1000,
    refetchInterval: (query) => {
      const jobs = query.state.data || [];
      return jobs.some((job) => job.status === 'running') ? 5000 : false;
    },
  });
}

export function useCreateOfficeBulkJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateBulkJobPayload) => {
      return await api.post('/office-ops/bulk/jobs/', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-ops', 'bulk-jobs'] });
    },
  });
}

export function useExecuteOfficeBulkJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobId: string) => {
      return await api.post(`/office-ops/bulk/jobs/${jobId}/execute/`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-ops', 'bulk-jobs'] });
    },
  });
}

export function useRetryOfficeBulkJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobId: string) => {
      return await api.post(`/office-ops/bulk/jobs/${jobId}/retry/`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-ops', 'bulk-jobs'] });
    },
  });
}
