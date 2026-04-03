import Button from "@/components/Button";
import { DIFFICULTY_VALUES } from "@/lib/constants";
import { useT } from "@/lib/i18n/useT";
import { Difficulty } from "@/lib/types";

type Props = {
  onStartNewGame: (difficulty: Difficulty) => void;
};

export default function NewGameSection({ onStartNewGame }: Props) {
  const t = useT();

  return (
    <div className="home-section">
      <p className="home-section-label">{t("home.newGame")}</p>
      <div className="home-difficulty">
        {DIFFICULTY_VALUES.map((difficulty) => (
          <Button key={difficulty} onClick={() => onStartNewGame(difficulty)}>
            {t(`difficulty.${difficulty}`)}
          </Button>
        ))}
      </div>
    </div>
  );
}
