import { ReactNode } from "react";
import { useTranslations } from 'next-intl';

export default function NotAuthorized({ children }: { children?: ReactNode }) {
  const t = useTranslations();
  
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-y-4">
      <p className="text-danger text-4xl font-bold">{t('statusScreens.notAuthorized.title')}🚫</p>
      <p className="text-foreground text-center text-lg">
        {t('statusScreens.notAuthorized.subtitle')}
      </p>
      {children}
    </div>
  );
}
