import Button from "@/components/Button";
import { DailyChallengeStatus } from "@/lib/hooks/useDailyChallengeStatus";
import { useT } from "@/lib/i18n/useT";

type Props = {
  daily: DailyChallengeStatus;
  isAuthenticated: boolean;
  onPlayDaily: (date: string) => void;
  onSignIn: () => void;
};

export default function DailyChallengeCard({ daily, isAuthenticated, onPlayDaily, onSignIn }: Props) {
  const t = useT();

  return (
    <div className="home-section">
      <p className="home-section-label">{t("home.dailyChallenge")}</p>
      {daily.loading ? <p className="home-daily-note">{t("home.loadingToday")}</p> : null}
      {!daily.loading && daily.message ? <p className="home-daily-note">{daily.message}</p> : null}
      {!daily.loading && isAuthenticated && daily.available ? (
        <Button
          variant="primary"
          className="home-resume-btn"
          disabled={daily.completed}
          onClick={() => onPlayDaily(daily.date)}
        >
          {daily.completed
            ? t("home.dailyCompleted")
            : t("home.playDaily", { difficulty: t(`difficulty.${daily.difficulty ?? "medium"}`) })}
        </Button>
      ) : null}
      {!daily.loading && !isAuthenticated ? (
        <Button className="home-resume-btn" onClick={onSignIn}>
          {t("home.signInForDaily")}
        </Button>
      ) : null}
    </div>
  );
}
