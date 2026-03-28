import Button from "@/components/Button";
import { DIFFICULTY_VALUES } from "@/lib/constants";
import { Difficulty } from "@/lib/types";

type Props = {
  onStartNewGame: (difficulty: Difficulty) => void;
};

export default function NewGameSection({ onStartNewGame }: Props) {
  return (
    <div className="home-section">
      <p className="home-section-label">New game</p>
      <div className="home-difficulty">
        {DIFFICULTY_VALUES.map((difficulty) => (
          <Button key={difficulty} onClick={() => onStartNewGame(difficulty)}>
            {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
          </Button>
        ))}
      </div>
    </div>
  );
}
