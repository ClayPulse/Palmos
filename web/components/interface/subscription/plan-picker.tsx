import { Button } from "@heroui/react";

export default function PlanPicker() {
  return (
    <div className="flex">
      <div>
        Free: Use free plan and enjoy basic features. Access to self-hosted
        workspaces and bring your own API keys. This option will remain
        available forever and we are committed to keeping it free and open
        source.
        <Button>
          Read more about our open source commitment
        </Button>
      </div>
    </div>
  );
}
