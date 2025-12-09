'use client';

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { useAuth } from '@/components/contexts/AuthContext';
import { toast } from 'sonner';
import {
  fetchAssemblies,
  fetchAssembly,
  createAssembly,
  updateAssembly,
  deleteAssembly,
  startAssembly,
  endAssembly,
  adjournAssembly,
  sendAssemblyInvitation,
  getAssemblyQuorum,
  generateAssemblyMinutes,
  approveAssemblyMinutes,
  getAssemblyLiveStatus,
  fetchAgendaItems,
  createAgendaItem,
  updateAgendaItem,
  deleteAgendaItem,
  startAgendaItem,
  endAgendaItem,
  deferAgendaItem,
  getAgendaItemVoteResults,
  fetchAssemblyAttendees,
  attendeeCheckIn,
  attendeeCheckOut,
  attendeeRSVP,
  attendeeCastVote,
  type Assembly,
  type AssemblyListItem,
  type AgendaItem,
  type AssemblyAttendee,
  type CreateAssemblyPayload,
  type CreateAgendaItemPayload,
  type RSVPStatus,
  type AttendanceType,
  type VoteChoice,
} from '@/lib/api';

// ============================================================
// Assembly Queries
// ============================================================

export function useAssemblies(
  buildingId?: number | null,
  options?: UseQueryOptions<AssemblyListItem[], Error>
) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  const enabled = isAuthenticated && !authLoading;
  console.log('[useAssemblies] buildingId:', buildingId, 'isAuthenticated:', isAuthenticated, 'authLoading:', authLoading, 'enabled:', enabled);

  return useQuery<AssemblyListItem[], Error>({
    queryKey: ['assemblies', buildingId],
    queryFn: () => fetchAssemblies(buildingId),
    enabled,
    staleTime: 1000 * 60, // 1 minute
    ...options,
  });
}

export function useAssembly(
  assemblyId: string | undefined,
  options?: UseQueryOptions<Assembly, Error>
) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  return useQuery<Assembly, Error>({
    queryKey: ['assembly', assemblyId],
    queryFn: () => fetchAssembly(assemblyId!),
    enabled: isAuthenticated && !authLoading && !!assemblyId,
    staleTime: 1000 * 30, // 30 seconds - more frequent for live updates
    ...options,
  });
}

export function useAssemblyLiveStatus(
  assemblyId: string | undefined,
  enabled: boolean = true
) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['assembly-live-status', assemblyId],
    queryFn: () => getAssemblyLiveStatus(assemblyId!),
    enabled: isAuthenticated && !!assemblyId && enabled,
    refetchInterval: 5000, // Every 5 seconds for live updates
    staleTime: 1000,
  });
}

export function useAssemblyQuorum(assemblyId: string | undefined) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['assembly-quorum', assemblyId],
    queryFn: () => getAssemblyQuorum(assemblyId!),
    enabled: isAuthenticated && !!assemblyId,
    refetchInterval: 10000, // Every 10 seconds
    staleTime: 5000,
  });
}

// ============================================================
// Assembly Mutations
// ============================================================

export function useCreateAssembly() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateAssemblyPayload) => createAssembly(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['assemblies'] });
      toast.success('Η συνέλευση δημιουργήθηκε');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Σφάλμα κατά τη δημιουργία');
    },
  });
}

export function useUpdateAssembly() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateAssemblyPayload> }) => 
      updateAssembly(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['assemblies'] });
      queryClient.invalidateQueries({ queryKey: ['assembly', data.id] });
      toast.success('Η συνέλευση ενημερώθηκε');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Σφάλμα κατά την ενημέρωση');
    },
  });
}

export function useDeleteAssembly() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteAssembly(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assemblies'] });
      toast.success('Η συνέλευση διαγράφηκε');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Σφάλμα κατά τη διαγραφή');
    },
  });
}

export function useStartAssembly() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => startAssembly(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['assembly', id] });
      queryClient.invalidateQueries({ queryKey: ['assemblies'] });
      toast.success('Η συνέλευση ξεκίνησε');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Σφάλμα κατά την έναρξη');
    },
  });
}

export function useEndAssembly() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => endAssembly(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['assembly', id] });
      queryClient.invalidateQueries({ queryKey: ['assemblies'] });
      toast.success('Η συνέλευση ολοκληρώθηκε');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Σφάλμα κατά τον τερματισμό');
    },
  });
}

export function useAdjournAssembly() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, continuationDate }: { id: string; continuationDate?: string }) => 
      adjournAssembly(id, continuationDate),
    onSuccess: (data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['assembly', id] });
      queryClient.invalidateQueries({ queryKey: ['assemblies'] });
      toast.success('Η συνέλευση αναβλήθηκε');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Σφάλμα κατά την αναβολή');
    },
  });
}

export function useSendAssemblyInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => sendAssemblyInvitation(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['assembly', id] });
      queryClient.invalidateQueries({ queryKey: ['assemblies'] });
      toast.success('Η πρόσκληση εστάλη');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Σφάλμα κατά την αποστολή πρόσκλησης');
    },
  });
}

export function useGenerateMinutes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, options }: { 
      id: string; 
      options?: { template_id?: string; secretary_name?: string; chairman_name?: string } 
    }) => generateAssemblyMinutes(id, options),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['assembly', id] });
      toast.success('Τα πρακτικά δημιουργήθηκαν');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Σφάλμα κατά τη δημιουργία πρακτικών');
    },
  });
}

export function useApproveMinutes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => approveAssemblyMinutes(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['assembly', id] });
      toast.success('Τα πρακτικά εγκρίθηκαν');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Σφάλμα κατά την έγκριση πρακτικών');
    },
  });
}

// ============================================================
// Agenda Item Queries & Mutations
// ============================================================

export function useAgendaItems(
  assemblyId: string | undefined,
  options?: UseQueryOptions<AgendaItem[], Error>
) {
  const { isAuthenticated } = useAuth();

  return useQuery<AgendaItem[], Error>({
    queryKey: ['agenda-items', assemblyId],
    queryFn: () => fetchAgendaItems(assemblyId!),
    enabled: isAuthenticated && !!assemblyId,
    staleTime: 1000 * 30,
    ...options,
  });
}

export function useAgendaItemVoteResults(itemId: string | undefined) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['agenda-item-votes', itemId],
    queryFn: () => getAgendaItemVoteResults(itemId!),
    enabled: isAuthenticated && !!itemId,
    staleTime: 1000 * 10,
  });
}

export function useCreateAgendaItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ assemblyId, payload }: { assemblyId: string; payload: CreateAgendaItemPayload }) => 
      createAgendaItem(assemblyId, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['agenda-items', data.assembly] });
      queryClient.invalidateQueries({ queryKey: ['assembly', data.assembly] });
      toast.success('Το θέμα προστέθηκε');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Σφάλμα κατά την προσθήκη θέματος');
    },
  });
}

export function useUpdateAgendaItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateAgendaItemPayload> }) => 
      updateAgendaItem(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['agenda-items', data.assembly] });
      queryClient.invalidateQueries({ queryKey: ['assembly', data.assembly] });
      toast.success('Το θέμα ενημερώθηκε');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Σφάλμα κατά την ενημέρωση θέματος');
    },
  });
}

export function useDeleteAgendaItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteAgendaItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda-items'] });
      queryClient.invalidateQueries({ queryKey: ['assembly'] });
      toast.success('Το θέμα διαγράφηκε');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Σφάλμα κατά τη διαγραφή θέματος');
    },
  });
}

export function useStartAgendaItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => startAgendaItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda-items'] });
      queryClient.invalidateQueries({ queryKey: ['assembly'] });
      queryClient.invalidateQueries({ queryKey: ['assembly-live-status'] });
      toast.success('Ξεκίνησε η συζήτηση του θέματος');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Σφάλμα');
    },
  });
}

export function useEndAgendaItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, options }: { id: string; options?: { decision?: string; decision_type?: string } }) => 
      endAgendaItem(id, options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda-items'] });
      queryClient.invalidateQueries({ queryKey: ['assembly'] });
      queryClient.invalidateQueries({ queryKey: ['assembly-live-status'] });
      toast.success('Ολοκληρώθηκε το θέμα');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Σφάλμα');
    },
  });
}

export function useDeferAgendaItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => deferAgendaItem(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda-items'] });
      queryClient.invalidateQueries({ queryKey: ['assembly'] });
      toast.success('Το θέμα αναβλήθηκε');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Σφάλμα');
    },
  });
}

// ============================================================
// Attendee Queries & Mutations
// ============================================================

export function useAssemblyAttendees(
  assemblyId: string | undefined,
  options?: UseQueryOptions<AssemblyAttendee[], Error>
) {
  const { isAuthenticated } = useAuth();

  return useQuery<AssemblyAttendee[], Error>({
    queryKey: ['assembly-attendees', assemblyId],
    queryFn: () => fetchAssemblyAttendees(assemblyId!),
    enabled: isAuthenticated && !!assemblyId,
    staleTime: 1000 * 15,
    ...options,
  });
}

export function useAttendeeCheckIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, attendanceType }: { id: string; attendanceType?: AttendanceType }) => 
      attendeeCheckIn(id, attendanceType),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['assembly-attendees'] });
      queryClient.invalidateQueries({ queryKey: ['assembly-quorum'] });
      queryClient.invalidateQueries({ queryKey: ['assembly'] });
      toast.success('Check-in επιτυχές');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Σφάλμα κατά το check-in');
    },
  });
}

export function useAttendeeCheckOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => attendeeCheckOut(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assembly-attendees'] });
      queryClient.invalidateQueries({ queryKey: ['assembly-quorum'] });
      queryClient.invalidateQueries({ queryKey: ['assembly'] });
      toast.success('Check-out επιτυχές');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Σφάλμα κατά το check-out');
    },
  });
}

export function useAttendeeRSVP() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: RSVPStatus; notes?: string }) => 
      attendeeRSVP(id, status, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assembly-attendees'] });
      queryClient.invalidateQueries({ queryKey: ['assembly'] });
      toast.success('Η απάντηση καταγράφηκε');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Σφάλμα κατά την καταγραφή RSVP');
    },
  });
}

export function useCastVote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ attendeeId, agendaItemId, vote, notes }: { 
      attendeeId: string; 
      agendaItemId: string; 
      vote: VoteChoice; 
      notes?: string 
    }) => attendeeCastVote(attendeeId, agendaItemId, vote, notes),
    onSuccess: (_, { agendaItemId }) => {
      queryClient.invalidateQueries({ queryKey: ['agenda-items'] });
      queryClient.invalidateQueries({ queryKey: ['agenda-item-votes', agendaItemId] });
      queryClient.invalidateQueries({ queryKey: ['assembly'] });
      toast.success('Η ψήφος καταγράφηκε');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Σφάλμα κατά την ψηφοφορία');
    },
  });
}

