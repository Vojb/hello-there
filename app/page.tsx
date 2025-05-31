"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { useEffect, useState } from "react";
import { database } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import { Logo } from "./components/Logo";

interface Player {
  id: string;
  name: string;
  nickname?: string;
  imageUrl?: string;
}

interface Game {
  id: string;
  createdAt: number;
  playerOneId: string;
  playerTwoId: string;
  status: "waiting" | "in_progress" | "completed";
}

export default function Home() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [latestGame, setLatestGame] = useState<Game | null>(null);
  const [recentGames, setRecentGames] = useState<Game[]>([]);

  useEffect(() => {
    const playersRef = ref(database, "players");
    const unsubscribe = onValue(playersRef, (snapshot) => {
      const data = snapshot.val();
      const playersList: Player[] = [];

      if (data) {
        Object.entries(data).forEach(([id, value]) => {
          const player = value as {
            name: string;
            imageUrl?: string;
            nickname?: string;
          };
          playersList.push({
            id,
            name: player.name,
            imageUrl: player.imageUrl,
            nickname: player.nickname,
          });
        });
      }

      setPlayers(playersList);
    });

    // Subscribe to games
    const gamesRef = ref(database, "games");
    const unsubscribeGames = onValue(gamesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const games = Object.entries(data).map(([id, value]) => ({
          id,
          ...(value as Omit<Game, "id">),
        }));
        // Sort by creation date and get the latest
        const sortedGames = games.sort((a, b) => b.createdAt - a.createdAt);
        setLatestGame(sortedGames[0]);
        setRecentGames(sortedGames.slice(0, 2));
      }
    });

    return () => {
      unsubscribe();
      unsubscribeGames();
    };
  }, []);

  const getPlayerNames = (game: Game) => {
    if (!game?.playerOneId) return "No players yet";

    const playerOne = players.find((p) => p.id === game.playerOneId);
    const playerTwo = players.find((p) => p.id === game.playerTwoId);

    const playerOneName =
      playerOne?.nickname || playerOne?.name || "Unknown Player";
    const playerTwoName =
      playerTwo?.nickname || playerTwo?.name || "Unknown Player";

    if (!game.playerTwoId) return `${playerOneName} vs ...`;
    return `${playerOneName} vs ${playerTwoName}`;
  };

  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-1 opacity-50">
        {players
          .map((player) => ({ ...player, sort: Math.random() }))
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

      {/* Content */}
      <div className="container mx-auto p-4 md:p-8 relative z-10">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 text-primary">Guess Who?</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Test your knowledge of your squad! Can you guess who's who based on
            their characteristics?
          </p>
        </div>

        {/* Game Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card className="transform transition-all duration-300 hover:scale-105 border-border bg-background/80 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute inset-0 opacity-30 h-full w-full flex items-center justify-center">
              <Logo />
            </div>
            <CardHeader className="relative z-10">
              <CardTitle className="text-2xl text-card-foreground">
                Start New Game
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Create a new game and invite your squad
              </CardDescription>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="relative h-48 mb-4 rounded-lg overflow-hidden bg-accent/10">
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-lg font-medium text-card-foreground">
                    Create a new game room and share the code with your friends
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="relative z-10">
              <Link href="/games" className="w-full">
                <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                  Create Game
                </Button>
              </Link>
            </CardFooter>
          </Card>

          <Card className="transform transition-all duration-300 hover:scale-105 border-border bg-background/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl text-card-foreground">
                Join Game
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Enter an existing game with a code
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative h-48 mb-4 rounded-lg overflow-hidden bg-secondary/10">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-lg font-medium text-card-foreground">
                      Join your friends' game using their game code
                    </p>
                  </div>
                </div>
                <div className="space-y-2 mb-4">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Recent Games:
                  </h4>
                  {recentGames.length > 0 && (
                    <div className="space-y-2">
                      {recentGames.map((game) => (
                        <div
                          key={game.id}
                          className="flex items-center justify-between p-2 rounded-md bg-secondary/10 hover:bg-secondary/20 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {getPlayerNames(game)}
                            </span>
                            <span
                              className={`text-xs px-2 py-1 rounded-full ${
                                game.status === "waiting"
                                  ? "bg-yellow-500/20 text-yellow-500"
                                  : game.status === "in_progress"
                                  ? "bg-blue-500/20 text-blue-500"
                                  : "bg-green-500/20 text-green-500"
                              }`}
                            >
                              {game?.status?.replace("_", " ").toUpperCase()}
                            </span>
                          </div>
                          <Link href={`/games/${game.id}`}>
                            <Button variant="ghost" size="sm" className="h-7">
                              Join
                            </Button>
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const gameId = formData.get("gameId") as string;
                    if (gameId) {
                      window.location.href = `/games/${gameId}`;
                    }
                  }}
                >
                  <Input
                    name="gameId"
                    placeholder="Enter game code"
                    className="w-full"
                    required
                  />
                  <Button
                    type="submit"
                    className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
                  >
                    Join Game
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* How to Play Section */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8 text-primary">
            How to Play
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-card/80 backdrop-blur-sm rounded-lg border border-border">
              <div className="text-2xl font-bold text-primary mb-2">1</div>
              <h3 className="font-semibold mb-2 text-card-foreground">
                Create or Join
              </h3>
              <p className="text-muted-foreground">
                Start a new game or join an existing one with a game code
              </p>
            </div>
            <div className="text-center p-4 bg-card/80 backdrop-blur-sm rounded-lg border border-border">
              <div className="text-2xl font-bold text-primary mb-2">2</div>
              <h3 className="font-semibold mb-2 text-card-foreground">
                Choose Character
              </h3>
              <p className="text-muted-foreground">
                Select a character from your squad for others to guess
              </p>
            </div>
            <div className="text-center p-4 bg-card/80 backdrop-blur-sm rounded-lg border border-border">
              <div className="text-2xl font-bold text-primary mb-2">3</div>
              <h3 className="font-semibold mb-2 text-card-foreground">
                Ask Questions
              </h3>
              <p className="text-muted-foreground">
                Take turns asking yes/no questions to guess the character
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
