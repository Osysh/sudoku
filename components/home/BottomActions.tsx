import Button from "@/components/Button";
import { useT } from "@/lib/i18n/useT";

type Props = {
  onOpenLeaderboard: () => void;
};

export default function BottomActions({ onOpenLeaderboard }: Props) {
  const t = useT();

  return (
    <div className="home-bottom-row">
      <Button
        className="home-icon-btn"
        onClick={onOpenLeaderboard}
        aria-label={t("common.leaderboard")}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M19 5h-2V3H7v2H5C3.9 5 3 5.9 3 7v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0 0 11 15.9V18H9v2h6v-2h-2v-2.1a5.01 5.01 0 0 0 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zm-14 3V7h2v3.82C5.86 10.4 5 9.3 5 8zm14 0c0 1.3-.86 2.4-2 2.82V7h2v1z" />
        </svg>
        <span>{t("common.leaderboard")}</span>
      </Button>

      <Button
        className="home-icon-btn home-icon-btn--disabled"
        disabled
        aria-label={t("home.multiplayerComingSoon")}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
        </svg>
        <span>{t("home.multiplayer")}</span>
      </Button>
    </div>
  );
}
