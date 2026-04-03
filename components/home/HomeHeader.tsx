import BackgroundToggle from "@/components/BackgroundToggle";
import { useT } from "@/lib/i18n/useT";

export default function HomeHeader() {
  const t = useT();

  return (
    <div className="home-header">
      <h1 className="home-title">{t("common.appName")}</h1>
      <div className="game-controls">
        <BackgroundToggle />
      </div>
    </div>
  );
}
