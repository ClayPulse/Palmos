import { Progress } from "@heroui/react";
import { useTranslations } from '@/lib/hooks/use-translations';

export default function Loading({ text }: { text?: string }) {
  const {getTranslations: t} = useTranslations();
  
  return (
    <div className="flex h-full w-full flex-col items-center justify-center">
      <Progress
        isIndeterminate={true}
        className="w-1/2 text-default-foreground"
        color="default"
        size="md"
        label={text ?? t('statusScreens.loading.title')}
        classNames={{
          label: "w-full text-center",
        }}
      />
    </div>
  );
}
