"use client";

import { useAuth } from "@/lib/hooks/use-auth";
import { ReactNode, useContext, useEffect, useState } from "react";
import AgentConfigModal from "../modals/agent-config-modal";
import AutomationEditorModal from "../modals/automation-editor-modal";
import AppInfoModal from "../modals/app-info-modal";
import ArtifactModal from "../modals/artifact-modal";
import EditorSettingsModal from "../modals/editor-settings-modal";
import LoginModal from "../modals/login-modal";
import MarketplaceModal from "../modals/marketplace-modal";
import NodeNoteModal from "../modals/node-note-modal";
import OAuthConnectModal from "../modals/oauth-connect-modal";
import OpenInProjectModal from "../modals/open-in-project-modal";
import OpenSourceInfoModal from "../modals/open-source-info-modal";
import PasswordModal from "../modals/password-modal";
import ProjectSettingsModal from "../modals/project-settings-modal";
import PublishWorkflowModal from "../modals/publish-workflow-modal";
import QuickVibeCodeSetupModal from "../modals/quick-vibe-code-setup-modal";
import SharingModal from "../modals/sharing-modal";
import WorkflowSettingsModal from "../modals/workflow-settings-modal";
import WorkspaceSettingsModal from "../modals/workspace-settings-model";
import { EditorContext } from "./editor-context-provider";

function useDelayedUnmount(isOpen: boolean, delay = 1000) {
  const [shouldRender, setShouldRender] = useState(isOpen);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (isOpen) {
      setShouldRender(true);
    } else {
      timeoutId = setTimeout(() => {
        setShouldRender(false);
      }, delay);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isOpen, delay]);

  return shouldRender;
}

const delaySeconds = 300;

export default function ModalProvider({ children }: { children: ReactNode }) {
  const editorContext = useContext(EditorContext);

  const { session, isLoading: isLoadingSession, signIn } = useAuth();

  const modalStates = editorContext?.editorStates.modalStates;

  return (
    <div className="h-full w-full overflow-hidden">
      {children}

      {/* TODO: Move more modals here */}
      {useDelayedUnmount(
        modalStates?.marketplace?.isOpen ?? false,
        delaySeconds,
      ) && (
        <MarketplaceModal
          isOpen={modalStates?.marketplace?.isOpen ?? false}
          onClose={() =>
            editorContext?.updateModalStates({ marketplace: { isOpen: false } })
          }
        />
      )}

      {useDelayedUnmount(
        modalStates?.openInProject?.isOpen ?? false,
        delaySeconds,
      ) && (
        <OpenInProjectModal
          isOpen={modalStates?.openInProject?.isOpen ?? false}
          onClose={() =>
            editorContext?.updateModalStates({
              openInProject: { isOpen: false },
            })
          }
        />
      )}

      {useDelayedUnmount(
        modalStates?.quickVibeCodeSetup?.isOpen ?? false,
        delaySeconds,
      ) && (
        <QuickVibeCodeSetupModal
          isOpen={modalStates?.quickVibeCodeSetup?.isOpen ?? false}
          onClose={() =>
            editorContext?.updateModalStates({
              quickVibeCodeSetup: { isOpen: false },
            })
          }
        />
      )}

      {useDelayedUnmount(
        modalStates?.editorSettings?.isOpen ?? false,
        delaySeconds,
      ) && (
        <EditorSettingsModal
          isOpen={modalStates?.editorSettings?.isOpen ?? false}
          onClose={() =>
            editorContext?.updateModalStates({
              editorSettings: { isOpen: false },
            })
          }
        />
      )}

      {useDelayedUnmount(
        modalStates?.workspaceSettings?.isOpen ?? false,
        delaySeconds,
      ) && (
        <WorkspaceSettingsModal
          isOpen={modalStates?.workspaceSettings?.isOpen ?? false}
          onClose={() =>
            editorContext?.updateModalStates({
              workspaceSettings: { isOpen: false },
            })
          }
          initialWorkspace={modalStates?.workspaceSettings?.initialWorkspace}
          isShowUseButton={modalStates?.workspaceSettings?.isShowUseButton}
        />
      )}

      {useDelayedUnmount(
        modalStates?.agentConfig?.isOpen ?? false,
        delaySeconds,
      ) && (
        <AgentConfigModal
          isOpen={modalStates?.agentConfig?.isOpen ?? false}
          onClose={() =>
            editorContext?.updateModalStates({
              agentConfig: {
                isOpen: false,
              },
            })
          }
        />
      )}

      {useDelayedUnmount(
        modalStates?.appInfo?.isOpen ?? false,
        delaySeconds,
      ) && (
        <AppInfoModal
          isOpen={modalStates?.appInfo?.isOpen ?? false}
          onClose={() => {
            editorContext?.updateModalStates({
              appInfo: { isOpen: false },
            });
          }}
        />
      )}

      {useDelayedUnmount(
        !isLoadingSession &&
          !session &&
          (editorContext?.editorStates.isSigningIn ?? false),
        delaySeconds,
      ) && (
        <LoginModal
          isOpen={
            !isLoadingSession &&
            !session &&
            (editorContext?.editorStates.isSigningIn ?? false)
          }
          signIn={signIn}
          onClose={() => {
            editorContext?.updateModalStates({
              login: { isOpen: false },
            });
          }}
        />
      )}

      {useDelayedUnmount(
        modalStates?.openSourceInfo?.isOpen ?? false,
        delaySeconds,
      ) && (
        <OpenSourceInfoModal
          isOpen={modalStates?.openSourceInfo?.isOpen ?? false}
          onClose={() =>
            editorContext?.updateModalStates({
              openSourceInfo: { isOpen: false },
            })
          }
        />
      )}

      {useDelayedUnmount(
        modalStates?.password?.isOpen ?? false,
        delaySeconds,
      ) && (
        <PasswordModal
          isOpen={modalStates?.password?.isOpen ?? false}
          onClose={() => {
            editorContext?.updateModalStates({
              password: { isOpen: false },
            });
          }}
        />
      )}

      {useDelayedUnmount(
        modalStates?.projectSettings?.isOpen ?? false,
        delaySeconds,
      ) && (
        <ProjectSettingsModal
          isOpen={modalStates?.projectSettings?.isOpen ?? false}
          onClose={() => {
            editorContext?.updateModalStates({
              projectSettings: { isOpen: false },
            });
          }}
          projectInfo={modalStates?.projectSettings?.projectInfo}
        />
      )}

      {useDelayedUnmount(
        modalStates?.publishWorkflow?.isOpen ?? false,
        delaySeconds,
      ) && (
        <PublishWorkflowModal
          isOpen={modalStates?.publishWorkflow?.isOpen ?? false}
          onClose={() => {
            editorContext?.updateModalStates({
              publishWorkflow: { isOpen: false },
            });
          }}
          workflowCanvas={modalStates?.publishWorkflow?.workflowCanvas ?? null}
          localNodes={modalStates?.publishWorkflow?.localNodes ?? []}
          localEdges={modalStates?.publishWorkflow?.localEdges ?? []}
          entryPoint={modalStates?.publishWorkflow?.entryPoint}
          saveAppsSnapshotStates={
            modalStates?.publishWorkflow?.saveAppsSnapshotStates
          }
          openedWorkflow={modalStates?.publishWorkflow?.openedWorkflow}
        />
      )}

      {useDelayedUnmount(
        modalStates?.workflowSettings?.isOpen ?? false,
        delaySeconds,
      ) &&
        modalStates?.workflowSettings?.workflowName && (
          <WorkflowSettingsModal
            isOpen={modalStates?.workflowSettings?.isOpen ?? false}
            workflowName={modalStates.workflowSettings.workflowName}
            onClose={() =>
              editorContext?.updateModalStates({
                workflowSettings: { isOpen: false },
              })
            }
          />
        )}

      {useDelayedUnmount(
        modalStates?.sharing?.isOpen ?? false,
        delaySeconds,
      ) && (
        <SharingModal
          isOpen={modalStates?.sharing?.isOpen ?? false}
          onClose={() => {
            editorContext?.updateModalStates({
              sharing: { isOpen: false },
            });
          }}
        />
      )}

      {useDelayedUnmount(
        modalStates?.artifact?.isOpen ?? false,
        delaySeconds,
      ) && (
        <ArtifactModal
          isOpen={modalStates?.artifact?.isOpen ?? false}
          onClose={() => {
            editorContext?.updateModalStates({
              artifact: { isOpen: false },
            });
          }}
        />
      )}

      {useDelayedUnmount(
        modalStates?.nodeNote?.isOpen ?? false,
        delaySeconds,
      ) && (
        <NodeNoteModal
          isOpen={modalStates?.nodeNote?.isOpen ?? false}
          onClose={() => {
            editorContext?.updateModalStates({
              nodeNote: { isOpen: false },
            });
          }}
        />
      )}
      {useDelayedUnmount(
        modalStates?.oauthConnect?.isOpen ?? false,
        delaySeconds,
      ) && (
        <OAuthConnectModal
          isOpen={modalStates?.oauthConnect?.isOpen ?? false}
          onClose={() => {
            editorContext?.updateModalStates({
              oauthConnect: { isOpen: false },
            });
          }}
        />
      )}

      {useDelayedUnmount(
        modalStates?.automationEditor?.isOpen ?? false,
        delaySeconds,
      ) && (
        <AutomationEditorModal
          isOpen={modalStates?.automationEditor?.isOpen ?? false}
          onClose={() => {
            editorContext?.updateModalStates({
              automationEditor: { isOpen: false },
            });
          }}
        />
      )}
    </div>
  );
}
