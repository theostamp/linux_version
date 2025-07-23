import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createResident, CreateResidentPayload } from "@/lib/api";
import { toast } from "react-hot-toast";

export function useCreateResident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateResidentPayload) => createResident(payload),
    onSuccess: () => {
      // Ανανεώνουμε τη λίστα κατοίκων
      queryClient.invalidateQueries({ queryKey: ["residents"] });
      toast.success("Ο κάτοικος δημιουργήθηκε επιτυχώς");
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || "Αποτυχία δημιουργίας κατοίκου";
      toast.error(errorMessage);
    },
  });
} 