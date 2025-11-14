import { fetchAPI } from "@/lib/pulse-editor-website/backend";
import { addToast, Button, Input } from "@heroui/react";
import { useState } from "react";
import Icon from "./icon";

export default function EnvInput({
  appId,
  env,
  onUpdated,
}: {
  appId: string;
  env: { key: string; value: string; isSecret: boolean };
  onUpdated: () => void;
}) {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedValue, setEditedValue] = useState<string>(env.value);
  const [isSecret, setIsSecret] = useState<boolean>(env.isSecret);

  return (
    <div className="flex items-center gap-x-1" key={env.key}>
      <div className="w-1/3 font-mono text-sm break-all">{env.key}</div>
      <div className="w-2/3 font-mono text-sm break-all">
        {isEditing ? (
          <Input
            size="sm"
            value={editedValue}
            onValueChange={setEditedValue}
            type={isSecret ? "password" : "text"}
          />
        ) : (
          <p>{env.value}</p>
        )}
      </div>

      {isEditing ? (
        <Button
          isIconOnly
          variant="light"
          onPress={async () => {
            addToast({
              title: "Updating Variable",
              description: `Updating environment variable ${env.key}.`,
            });

            await fetchAPI("/api/app/settings/env/set", {
              method: "POST",
              body: JSON.stringify({
                appId: appId,
                key: env.key,
                value: editedValue,
                isSecret: isSecret,
              }),
              headers: {
                "Content-Type": "application/json",
              },
            });

            onUpdated();
            setIsEditing((prev) => false);

            addToast({
              title: "Variable Updated",
              description: `Environment variable ${env.key} updated successfully.`,
              color: "success",
            });
          }}
        >
          <Icon name="check" />
        </Button>
      ) : (
        <Button
          isIconOnly
          variant="light"
          onPress={() => setIsEditing((prev) => true)}
        >
          <Icon name="edit" />
        </Button>
      )}

      {isEditing ? (
        <Button
          isIconOnly
          variant="light"
          onPress={() => setIsSecret((prev) => !prev)}
        >
          {isSecret ? <Icon name="lock" /> : <Icon name="lock_open" />}
        </Button>
      ) : (
        <Button
          isIconOnly
          variant="light"
          onPress={async () => {
            addToast({
              title: "Deleting Variable",
              description: `Deleting environment variable ${env.key}.`,
            });
            await fetchAPI("/api/app/settings/env/delete", {
              method: "DELETE",
              body: JSON.stringify({
                appId: appId,
                key: env.key,
              }),
              headers: {
                "Content-Type": "application/json",
              },
            });
            onUpdated();

            addToast({
              title: "Variable Deleted",
              description: `Environment variable ${env.key} deleted successfully.`,
              color: "success",
            });
          }}
        >
          <Icon name="delete" className="text-danger!" />
        </Button>
      )}
    </div>
  );
}
