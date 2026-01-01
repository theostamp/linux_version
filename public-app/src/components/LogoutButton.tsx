'use client';

import { Button } from "@/components/ui/button";
import useLogout from "@/hooks/useLogout";
import { cn } from "@/lib/utils";

export default function LogoutButton({ className }: { readonly className?: string }) {
  const logout = useLogout();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <Button
      variant="outline"
      onClick={handleLogout}
      className={cn(className)}
    >
      Αποσύνδεση
    </Button>
  );
}
