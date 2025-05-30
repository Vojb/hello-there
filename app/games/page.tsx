"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { database } from "@/lib/firebase";
import { ref, push, onValue, remove } from "firebase/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowRight, Plus, Shuffle, Target, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Player {
  id: string;
  name: string;
  imageUrl?: string;
}

interface Game {
  id: string;
  createdAt: number;
  playerOneId: string;
  playerTwoId: string;
  targetMode: "select" | "random";
  gamePhase: "setup" | "target-selection" | "playing";
}

export default function GamesPage() {
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameId, setGameId] = useState("");
  const [selectedPlayerOne, setSelectedPlayerOne] = useState("");
  const [selectedPlayerTwo, setSelectedPlayerTwo] = useState("");
  const [targetMode, setTargetMode] = useState<"select" | "random">("select");
  const [isLoading, setIsLoading] = useState(true);
  const [gameToDelete, setGameToDelete] = useState<string | null>(null);

  // Load games
  useEffect(() => {
    const gamesRef = ref(database, "games");

    const unsubscribe = onValue(gamesRef, (snapshot) => {
      const data = snapshot.val();
      const gamesList: Game[] = [];

      if (data) {
        Object.entries(data).forEach(([id, value]) => {
          const game = value as {
            createdAt: number;
            playerOneId: string;
            playerTwoId: string;
            targetMode?: "select" | "random";
            gamePhase?: "setup" | "target-selection" | "playing";
          };
          gamesList.push({
            id,
            createdAt: game.createdAt,
            playerOneId: game.playerOneId,
            playerTwoId: game.playerTwoId,
            targetMode: game.targetMode || "select",
            gamePhase: game.gamePhase || "setup",
          });
        });
      }

      // Sort games by creation time (newest first)
      gamesList.sort((a, b) => b.createdAt - a.createdAt);

      setGames(gamesList);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Load players
  useEffect(() => {
    const playersRef = ref(database, "players");

    const unsubscribe = onValue(playersRef, (snapshot) => {
      const data = snapshot.val();
      const playersList: Player[] = [];

      if (data) {
        Object.entries(data).forEach(([id, value]) => {
          const player = value as { name: string; imageUrl?: string };
          playersList.push({
            id,
            name: player.name,
            imageUrl: player.imageUrl,
          });
        });
      }

      setPlayers(playersList);
    });

    return () => unsubscribe();
  }, []);

  const createNewGame = async () => {
    if (!selectedPlayerOne || !selectedPlayerTwo) {
      return;
    }

    if (selectedPlayerOne === selectedPlayerTwo) {
      return;
    }

    const gamesRef = ref(database, "games");

    // Create initial board state with all players
    const initialBoard: Record<string, { crossed: boolean }> = {};
    players.forEach((player) => {
      initialBoard[player.id] = { crossed: false };
    });

    const newGame = {
      createdAt: Date.now(),
      playerOneId: selectedPlayerOne,
      playerTwoId: selectedPlayerTwo,
      targetMode: targetMode,
      gamePhase: "setup",
      playerOneJoined: false,
      playerTwoJoined: false,
      playerOneBoard: initialBoard,
      playerTwoBoard: initialBoard,
      currentTurn: "playerOne",
    };

    try {
      const gameRef = await push(gamesRef, newGame);
      if (gameRef.key) {
        router.push(`/games/${gameRef.key}`);
      }
    } catch (error) {
      console.error("Error creating game:", error);
    }
  };

  const joinGame = () => {
    if (gameId.trim()) {
      router.push(`/games/${gameId.trim()}`);
    }
  };

  const getPlayerName = (playerId: string) => {
    const player = players.find((p) => p.id === playerId);
    return player ? player.name : "Unknown Player";
  };

  const getGamePhaseText = (phase: string) => {
    switch (phase) {
      case "setup":
        return "Waiting for players";
      case "target-selection":
        return "Selecting targets";
      case "playing":
        return "In progress";
      default:
        return "Unknown";
    }
  };

  const deleteGame = async (gameId: string) => {
    try {
      const gameRef = ref(database, `games/${gameId}`);
      await remove(gameRef);
      setGameToDelete(null);
    } catch (error) {
      console.error("Error deleting game:", error);
    }
  };

  return (
    <div className="container mx-auto p-2 sm:p-4 md:p-8">
      <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Games</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-xl sm:text-2xl">
              Create New Game
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="playerOne">Player One</Label>
                <Select
                  value={selectedPlayerOne}
                  onValueChange={setSelectedPlayerOne}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Player One" />
                  </SelectTrigger>
                  <SelectContent>
                    {players.map((player) => (
                      <SelectItem key={player.id} value={player.id}>
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-6 w-6">
                            {player.imageUrl ? (
                              <AvatarImage
                                src={player.imageUrl || "/placeholder.svg"}
                                alt={player.name}
                              />
                            ) : (
                              <AvatarFallback className="text-xs">
                                {player.name.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <span className="truncate">{player.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="playerTwo">Player Two</Label>
                <Select
                  value={selectedPlayerTwo}
                  onValueChange={setSelectedPlayerTwo}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Player Two" />
                  </SelectTrigger>
                  <SelectContent>
                    {players
                      .filter((player) => player.id !== selectedPlayerOne)
                      .map((player) => (
                        <SelectItem key={player.id} value={player.id}>
                          <div className="flex items-center space-x-2">
                            <Avatar className="h-6 w-6">
                              {player.imageUrl ? (
                                <AvatarImage
                                  src={player.imageUrl || "/placeholder.svg"}
                                  alt={player.name}
                                />
                              ) : (
                                <AvatarFallback className="text-xs">
                                  {player.name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <span className="truncate">{player.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Target Selection Mode */}
              <div className="space-y-2">
                <Label>Target Selection Mode</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Button
                    variant={targetMode === "select" ? "default" : "outline"}
                    onClick={() => setTargetMode("select")}
                    className="h-12 w-full"
                  >
                    <Target className="mr-2 h-4 w-4" />
                    Choose Targets
                  </Button>
                  <Button
                    variant={targetMode === "random" ? "default" : "outline"}
                    onClick={() => setTargetMode("random")}
                    className="h-12 w-full"
                  >
                    <Shuffle className="mr-2 h-4 w-4" />
                    Random Targets
                  </Button>
                </div>
              </div>

              <Button
                onClick={createNewGame}
                disabled={
                  !selectedPlayerOne ||
                  !selectedPlayerTwo ||
                  selectedPlayerOne === selectedPlayerTwo
                }
                className="w-full h-12"
              >
                Create Game
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-xl sm:text-2xl">Join Game</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gameId">Game ID</Label>
                <Input
                  id="gameId"
                  placeholder="Enter Game ID"
                  value={gameId}
                  onChange={(e) => setGameId(e.target.value)}
                  className="w-full"
                />
              </div>
              <Button
                onClick={joinGame}
                disabled={!gameId.trim()}
                className="w-full h-12"
              >
                Join Game
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-semibold">Recent Games</h2>
        {isLoading ? (
          <div className="text-center py-8">Loading games...</div>
        ) : games.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No games found
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {games.map((game) => (
              <Card
                key={game.id}
                className="hover:bg-accent/50 transition-colors"
              >
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Game ID: {game.id.substring(0, 8)}...
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {getGamePhaseText(game.gamePhase)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            setGameToDelete(game.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <div
                      className="flex items-center space-x-2 cursor-pointer"
                      onClick={() => router.push(`/games/${game.id}`)}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {getPlayerName(game.playerOneId)
                            .substring(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate">
                        {getPlayerName(game.playerOneId)}
                      </span>
                    </div>
                    <div
                      className="flex items-center space-x-2 cursor-pointer"
                      onClick={() => router.push(`/games/${game.id}`)}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {getPlayerName(game.playerTwoId)
                            .substring(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate">
                        {getPlayerName(game.playerTwoId)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog
        open={!!gameToDelete}
        onOpenChange={() => setGameToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              game and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => gameToDelete && deleteGame(gameToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
