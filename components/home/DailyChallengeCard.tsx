import Button from "@/components/Button";
import { DailyChallengeStatus } from "@/lib/hooks/useDailyChallengeStatus";

type Props = {
  daily: DailyChallengeStatus;
  isAuthenticated: boolean;
  onPlayDaily: (date: string) => void;
  onSignIn: () => void;
};

export default function DailyChallengeCard({ daily, isAuthenticated, onPlayDaily, onSignIn }: Props) {
  return (
    <div className="home-section">
      <p className="home-section-label">Daily challenge</p>
      {daily.loading ? <p className="home-daily-note">Loading today&apos;s challenge...</p> : null}
      {!daily.loading && daily.message ? <p className="home-daily-note">{daily.message}</p> : null}
      {!daily.loading && isAuthenticated && daily.available ? (
        <Button
          variant="primary"
          className="home-resume-btn"
          disabled={daily.completed}
          onClick={() => onPlayDaily(daily.date)}
        >
          {daily.completed ? "Daily challenge completed" : `Play daily (${daily.difficulty ?? "medium"})`}
        </Button>
      ) : null}
      {!daily.loading && !isAuthenticated ? (
        <Button className="home-resume-btn" onClick={onSignIn}>
          Sign in for daily challenge
        </Button>
      ) : null}
    </div>
  );
}
