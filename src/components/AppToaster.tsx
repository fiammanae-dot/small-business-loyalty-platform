"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Toaster, toast } from "sonner";

export function AppToaster() {
  return (
    <>
      <Toaster
        richColors
        closeButton
        position="top-right"
        toastOptions={{
          classNames: {
            toast: "font-sans",
          },
        }}
      />
      <RouteToastMessages />
    </>
  );
}

function RouteToastMessages() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");

    if (!success && !error) return;

    if (success) {
      toast.success(success);
    }
    if (error) {
      toast.error(error);
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("success");
    nextParams.delete("error");
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  return null;
}
