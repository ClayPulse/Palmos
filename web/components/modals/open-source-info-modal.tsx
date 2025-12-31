import { Button } from "@heroui/react";
import Link from "next/link";
import Icon from "../misc/icon";
import ModalWrapper from "./wrapper";
export default function OpenSourceInfoModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title={"Open Source Information"}
    >
      <div className="flex w-full flex-col items-center gap-y-1">
        We believe in open software. Pulse Editor's core client and many of its
        official apps and workflows are fully open source, built to empower
        developers everywhere.
        <div className="flex gap-x-1">
          <Link href="https://github.com/claypulse/pulse-editor">
            <Button>
              <div className="flex items-center gap-0.5">
                <div>
                  <Icon
                    uri="/assets/github-mark"
                    extension=".svg"
                    isThemed
                    className="p-0.5 pl-0"
                  />
                </div>
                <p>Pulse Editor Core</p>
              </div>
            </Button>
          </Link>
          <Link href="https://github.com/claypulse/official-pulse-apps">
            <Button>
              <div className="flex items-center gap-0.5">
                <div>
                  <Icon
                    uri="/assets/github-mark"
                    extension=".svg"
                    isThemed
                    className="p-0.5 pl-0"
                  />
                </div>
                <p>Official Apps</p>
              </div>
            </Button>
          </Link>
        </div>
        Meanwhile, we offer cloud hosted services like remote workspaces and AI
        inference to make Pulse Editor easier to use at scale. Some of these
        services are closed source and require a subscription to access.
        <br />
        <br />
        Love what we are doing? Please consider ⭐ starring us on GitHub,
        downloading and giving feedback on Google Play.
        <div className="flex gap-x-1">
          <Link href="https://github.com/claypulse/pulse-editor">
            <Button>
              <div>
                <Icon
                  uri="/assets/github-mark"
                  extension=".svg"
                  isThemed
                  className="p-0.5 pl-0"
                />
              </div>
              <p> Give us a star</p>
            </Button>
          </Link>
          <Link href="https://play.google.com/store/apps/details?id=com.pulse_editor.app">
            <Button>
              <div>
                <Icon name="phone_android" />
              </div>
              <p>Google Play</p>
            </Button>
          </Link>
        </div>
      </div>
    </ModalWrapper>
  );
}
