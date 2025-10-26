import { Button } from "@heroui/react";
import Link from "next/link";
import ModalWrapper from "./modal-wrapper";
export default function OpenSourceInfoModal({
  isOpen,
  setIsOpen,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}) {
  return (
    <ModalWrapper
      isOpen={isOpen}
      setIsOpen={(open: boolean) => {
        setIsOpen(open);
      }}
      title={"Open Source Information"}
    >
      <div className="flex w-full flex-col">
        We believe in open software. Pulse Editor’s core and many of its
        official apps are fully open source, built to empower developers
        everywhere.
        <br />
        While we offer hosted services like remote workspaces and AI inference
        to make it easier to use at scale, we also believe in giving users full
        control so that you can self-host or bring your own keys anytime. Check
        out tutorials:
        <Link href="https://docs.pulse-editor.com/docs/self-hosting">
          <Button>Self-Hosting and BYOK</Button>
        </Link>
        Love what we are doing? Please consider ⭐ starring us on GitHub or
        donating to support open source development.
        <Link href="https://github.com/claypulse/pulse-editor">
          <Button>GitHub</Button>
        </Link>
      </div>
    </ModalWrapper>
  );
}
