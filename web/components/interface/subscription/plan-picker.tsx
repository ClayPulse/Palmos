import { Button } from "@heroui/react";
import { useTranslations } from "next-intl";

export default function PlanPicker() {
  const t = useTranslations();

  return (
    <div className="flex">
      <div>
        {t("planPicker.freeDescription")}
        <Button>
          {t("planPicker.readMoreOpenSource")}
        </Button>
      </div>
    </div>
  );
}
