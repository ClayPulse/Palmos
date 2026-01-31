import { Button } from "@heroui/react";
import Link from "next/link";
import Icon from "../misc/icon";
import ModalWrapper from "./wrapper";
import { useTranslations } from 'next-intl';

export default function OpenSourceInfoModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const t = useTranslations();
  
  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title={t('openSourceInfoModal.title')}
    >
      <div className="flex w-full flex-col items-center gap-y-1">
        {t('openSourceInfoModal.description')}
        <div className="flex gap-x-1">
          <Link href="https://github.com/claypulse/pulse-editor">
            <Button>
              <div className="flex items-center gap-0.5">
                <div>
                  <Icon
                    uri="/assets/github-mark"
                    extension=".svg"
                    isThemed
                    className="p-0.5 pl-0"
                  />
                </div>
                <p>{t('openSourceInfoModal.pulseEditorCore')}</p>
              </div>
            </Button>
          </Link>
          <Link href="https://github.com/claypulse/official-pulse-apps">
            <Button>
              <div className="flex items-center gap-0.5">
                <div>
                  <Icon
                    uri="/assets/github-mark"
                    extension=".svg"
                    isThemed
                    className="p-0.5 pl-0"
                  />
                </div>
                <p>{t('openSourceInfoModal.officialApps')}</p>
              </div>
            </Button>
          </Link>
        </div>
        {t('openSourceInfoModal.cloudServices')}
        <br />
        <br />
        {t('openSourceInfoModal.loveWhatWeDo')}
        <div className="flex gap-x-1">
          <Link href="https://github.com/claypulse/pulse-editor">
            <Button>
              <div>
                <Icon
                  uri="/assets/github-mark"
                  extension=".svg"
                  isThemed
                  className="p-0.5 pl-0"
                />
              </div>
              <p>{t('openSourceInfoModal.giveUsAStar')}</p>
            </Button>
          </Link>
          <Link href="https://play.google.com/store/apps/details?id=com.pulse_editor.app">
            <Button>
              <div>
                <Icon name="phone_android" />
              </div>
              <p>{t('openSourceInfoModal.googlePlay')}</p>
            </Button>
          </Link>
        </div>
      </div>
    </ModalWrapper>
  );
}
