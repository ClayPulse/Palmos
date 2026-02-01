import { useTranslations } from '@/lib/hooks/use-translations';

export default function WIP() {
  const {getTranslations: t} = useTranslations();
  
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-y-6">
      <p className="text-8xl">🚧</p>
      <p className="text-2xl text-center">{t('statusScreens.wip.subtitle')}</p>
    </div>
  );
}
