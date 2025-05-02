import { ReactNode, Suspense } from "react";

export default function ExtensionLayout({ children }: { children: ReactNode }) {
  return <Suspense>{children}</Suspense>;
}
