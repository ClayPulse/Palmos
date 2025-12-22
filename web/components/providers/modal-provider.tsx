"use client";

import { ReactNode, useContext } from "react";
import MarketplaceModal from "../modals/marketplace-modal";
import OpenInProjectModal from "../modals/open-in-project-modal";
import { EditorContext } from "./editor-context-provider";

export default function ModalProvider({ children }: { children: ReactNode }) {
  const editorContext = useContext(EditorContext);

  const modalStates = editorContext?.editorStates.modalStates;

  return (
    <div className="h-full w-full overflow-hidden">
      {children}

      {/* TODO: Move more modals here */}
      <MarketplaceModal
        isOpen={modalStates?.marketplace?.isOpen || false}
        setIsOpen={(isOpen) =>
          editorContext?.updateModalStates({ marketplace: { isOpen } })
        }
      />

      <OpenInProjectModal
        isOpen={modalStates?.openInProject?.isOpen || false}
        setIsOpen={(isOpen) =>
          editorContext?.updateModalStates({
            openInProject: { isOpen },
          })
        }
      />
    </div>
  );
}
