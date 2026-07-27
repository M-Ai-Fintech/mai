import { Button } from "@/components/Button/Button";
import { Dropdown } from "@/components/Dropdown/Dropdown";
import { FormField } from "@/components/FormField/FormField";
import { Input } from "@/components/Input/Input";
import { Modal } from "@/components/Modal/Modal";
import { Toast } from "@/components/Toast/Toast";
import { type AgentId, AGENTS } from "./agentic-workspace-model";
import type { ToastState } from "./agentic-workspace-types";
import { agentLabels } from "./agentic-workspace-view-model";

interface ThreadModalProps {
  open: boolean;
  creating: boolean;
  title: string;
  titleError: string | null;
  activeAgent: AgentId;
  onClose: () => void;
  onCreate: () => void;
  onTitleChange: (title: string) => void;
  onTitleErrorChange: (error: string | null) => void;
  onAgentChange: (value: string | string[]) => void;
}

export function AgenticOverlays(
  { threadModal, toast, onToastClose }: {
    threadModal: ThreadModalProps;
    toast: ToastState | null;
    onToastClose: () => void;
  },
) {
  return (
    <>
      <ThreadModal {...threadModal} />
      {toast && (
        <div className="fixed bottom-6 right-6 z-50">
          <Toast {...toast} onClose={onToastClose} />
        </div>
      )}
    </>
  );
}

function ThreadModal(props: ThreadModalProps) {
  return (
    <Modal
      isOpen={props.open}
      onClose={() => !props.creating && props.onClose()}
      size="md"
      title="New agent thread"
      subtitle="Create a deal-scoped conversation using an approved agent."
      footer={<ThreadModalFooter {...props} />}
    >
      <div className="space-y-5">
        <ThreadTitleField {...props} />
        <ThreadAgentField {...props} />
      </div>
    </Modal>
  );
}

function ThreadModalFooter(props: ThreadModalProps) {
  return (
    <>
      <Button
        variant="secondary"
        onClick={props.onClose}
        disabled={props.creating}
      >
        Cancel
      </Button>
      <Button
        variant="primary"
        onClick={props.onCreate}
        disabled={props.creating}
      >
        {props.creating ? "Creating…" : "Create thread"}
      </Button>
    </>
  );
}

function ThreadTitleField(props: ThreadModalProps) {
  return (
    <FormField label="Title" required error={props.titleError ?? undefined}>
      <Input
        autoFocus
        value={props.title}
        hasError={Boolean(props.titleError)}
        onChange={(event) => {
          props.onTitleChange(event.target.value);
          props.onTitleErrorChange(null);
        }}
      />
    </FormField>
  );
}

function ThreadAgentField(props: ThreadModalProps) {
  return (
    <FormField label="Agent" required>
      <Dropdown
        options={AGENTS.map((agent) => ({
          value: agent,
          label: agentLabels[agent],
          disabled: agent !== AGENTS[0],
        }))}
        value={props.activeAgent}
        onChange={props.onAgentChange}
      />
    </FormField>
  );
}
