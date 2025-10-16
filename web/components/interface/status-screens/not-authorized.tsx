import { ReactNode } from "react";

export default function NotAuthorized({ children }: { children?: ReactNode }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-y-4">
      <p className="text-danger text-4xl font-bold">Not Authorized🚫</p>
      <p className="text-foreground text-center text-lg">
        You do not have permission to access this content.
      </p>
      {children}
    </div>
  );
}
