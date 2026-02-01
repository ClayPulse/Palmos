import { Button } from "@heroui/react";
import { useTranslations } from "@/lib/hooks/use-translations";

export default function PlanPicker() {
  const {getTranslations: t} = useTranslations();

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
