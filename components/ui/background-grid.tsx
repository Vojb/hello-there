import { Player } from "@/types";
import { useMemo } from "react";

interface BackgroundGridProps {
  players: Player[];
  className?: string;
  sort: number;
}

export function BackgroundGrid({
  players,
  className,
  sort,
}: BackgroundGridProps) {
  const randomizedPlayers = useMemo(() => {
    return players
      .map((player) => ({ ...player, sort: Math.random() }))
      .filter(
        (player) =>
          player.imageUrl !=
          "https://www.fcmollan.se/_next/image?url=%2Fimages%2Favatar.jpg&w=828&q=75"
      )
      .sort((a, b) => a.sort - b.sort);
  }, [players]);

  return (
    <div className="fixed inset-0 w-full h-full">
      <div
        className={`absolute inset-0 grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-1 opacity-50 -z-10 ${className}`}
      >
        {randomizedPlayers
          .filter(
            (player) =>
              player.imageUrl !=
              "https://www.fcmollan.se/_next/image?url=%2Fimages%2Favatar.jpg&w=828&q=75"
          )
          .sort((a, b) => a.sort - b.sort)
          .map(({ id, name, imageUrl }) => (
            <div
              key={id}
              className="aspect-square relative overflow-hidden"
              style={{
                backgroundImage: imageUrl ? `url(${imageUrl})` : "none",
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
          ))}
      </div>
    </div>
  );
}
