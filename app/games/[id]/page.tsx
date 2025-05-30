"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { database } from "@/lib/firebase";
import { ref, onValue, update } from "firebase/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Check,
  Copy,
  Home,
  RefreshCw,
  X,
  Crown,
  Target,
  Shuffle,
  Trophy,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
  nickname?: string;
  imageUrl?: string;
}

interface GameData {
  createdAt: number;
  playerOneId: string;
  playerTwoId: string;
  targetMode: "select" | "random";
  gamePhase: "setup" | "target-selection" | "playing" | "finished";
  playerOneTargetId?: string;
  playerTwoTargetId?: string;
  playerOneJoined: boolean;
  playerTwoJoined: boolean;
  playerOneBoard: Record<string, { crossed: boolean }>;
  playerTwoBoard: Record<string, { crossed: boolean }>;
  currentTurn: "playerOne" | "playerTwo";
  winner?: "playerOne" | "playerTwo";
  winnerGuess?: string;
}

export default function GamePage() {
  const { id } = useParams() as { id: string };
  const { toast } = useToast();
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedRole, setSelectedRole] = useState<
    "playerOne" | "playerTwo" | null
  >(null);
  const [selectedTarget, setSelectedTarget] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [animatingPlayer, setAnimatingPlayer] = useState<string | null>(null);
  const [showGuessDialog, setShowGuessDialog] = useState(false);
  const [finalGuess, setFinalGuess] = useState<Player | null>(null);

  // Load game data
  useEffect(() => {
    const gameRef = ref(database, `games/${id}`);

    const unsubscribe = onValue(gameRef, (snapshot) => {
      const data = snapshot.val() as GameData | null;

      if (data) {
        setGameData(data);
      } else {
        toast({
          title: "Game not found",
          description: "This game doesn't exist or has been deleted.",
          variant: "destructive",
        });
      }

      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [id, toast]);

  // Load all players
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

  // Initialize board if needed
  useEffect(() => {
    if (
      gameData &&
      players.length > 0 &&
      (!gameData.playerOneBoard ||
        Object.keys(gameData.playerOneBoard).length === 0)
    ) {
      const gameRef = ref(database, `games/${id}`);

      // Create initial board state with all players
      const initialBoard: Record<string, { crossed: boolean }> = {};
      players.forEach((player) => {
        initialBoard[player.id] = { crossed: false };
      });

      update(gameRef, {
        playerOneBoard: initialBoard,
        playerTwoBoard: initialBoard,
      });
    }
  }, [gameData, players, id]);

  const selectRole = (role: "playerOne" | "playerTwo") => {
    setSelectedRole(role);

    // Update the game with the selected role
    const gameRef = ref(database, `games/${id}`);
    const updates: any = { [`${role}Joined`]: true };

    // Check if both players have joined and move to target selection phase
    const bothJoined =
      (role === "playerOne" ? true : gameData?.playerOneJoined) &&
      (role === "playerTwo" ? true : gameData?.playerTwoJoined);

    if (bothJoined) {
      if (gameData?.targetMode === "random") {
        // Auto-assign random targets and move to playing phase
        const availablePlayers = players.filter(
          (p) => p.id !== gameData.playerOneId && p.id !== gameData.playerTwoId
        );

        if (availablePlayers.length >= 2) {
          const shuffled = [...availablePlayers].sort(
            () => 0.5 - Math.random()
          );
          updates.playerOneTargetId = shuffled[0].id;
          updates.playerTwoTargetId = shuffled[1].id;
          updates.gamePhase = "playing";
        } else if (availablePlayers.length === 1) {
          updates.playerOneTargetId = availablePlayers[0].id;
          updates.playerTwoTargetId = availablePlayers[0].id;
          updates.gamePhase = "playing";
        }
      } else {
        // Move to target selection phase
        updates.gamePhase = "target-selection";
      }
    }

    update(gameRef, updates);
  };

  const selectTarget = () => {
    if (!gameData || !selectedRole || !selectedTarget) return;

    const gameRef = ref(database, `games/${id}`);
    const targetKey = `${selectedRole}TargetId`;

    const updates: any = {
      [targetKey]: selectedTarget,
    };

    // Check if both players have selected targets
    const otherRole = selectedRole === "playerOne" ? "playerTwo" : "playerOne";
    const otherTargetKey = `${otherRole}TargetId`;
    const otherTargetSelected = gameData[otherTargetKey as keyof GameData];

    if (otherTargetSelected) {
      // Both targets selected, move to playing phase
      updates.gamePhase = "playing";
    }

    update(gameRef, updates);
    setSelectedTarget("");
  };

  const assignRandomTargets = () => {
    if (!gameData) return;

    const availablePlayers = players.filter(
      (p) => p.id !== gameData.playerOneId && p.id !== gameData.playerTwoId
    );

    if (availablePlayers.length >= 2) {
      const shuffled = [...availablePlayers].sort(() => 0.5 - Math.random());

      const gameRef = ref(database, `games/${id}`);
      update(gameRef, {
        playerOneTargetId: shuffled[0].id,
        playerTwoTargetId: shuffled[1].id,
        gamePhase: "playing",
      });
    }
  };

  const togglePlayerCrossed = (playerId: string) => {
    if (!gameData || !selectedRole || gameData.gamePhase !== "playing") return;

    // Check if it's this player's turn
    if (gameData.currentTurn !== selectedRole) {
      toast({
        title: "Not your turn",
        description: "Wait for the other player to finish their turn.",
        variant: "destructive",
      });
      return;
    }

    // Don't allow crossing off the actual players
    if (
      playerId === gameData.playerOneId ||
      playerId === gameData.playerTwoId
    ) {
      toast({
        title: "Cannot eliminate players",
        description: "You cannot eliminate the actual game players.",
        variant: "destructive",
      });
      return;
    }

    const myBoard = getMyBoard();
    const remainingPlayers = getRemainingPlayers();

    // If this would leave only one player remaining, show confirmation dialog
    if (remainingPlayers.length === 2 && !myBoard[playerId]?.crossed) {
      const finalPlayer = remainingPlayers.find((p) => p.id !== playerId);
      if (finalPlayer) {
        setFinalGuess(finalPlayer);
        setShowGuessDialog(true);
        return;
      }
    }

    // Normal elimination
    eliminatePlayer(playerId);
  };

  const eliminatePlayer = (playerId: string) => {
    if (!gameData || !selectedRole) return;

    // Start animation
    setAnimatingPlayer(playerId);

    // Update the board for this player
    const boardKey = `${selectedRole}Board`;
    const currentBoard = gameData[boardKey as keyof GameData] as Record<
      string,
      { crossed: boolean }
    >;
    const newBoard = {
      ...currentBoard,
      [playerId]: { crossed: !currentBoard[playerId]?.crossed },
    };

    const gameRef = ref(database, `games/${id}`);
    update(gameRef, {
      [boardKey]: newBoard,
    });

    // End animation after a delay
    setTimeout(() => {
      setAnimatingPlayer(null);
    }, 600);
  };

  const makeGuess = () => {
    if (!gameData || !selectedRole || !finalGuess) return;

    const myTargetId =
      selectedRole === "playerOne"
        ? gameData.playerTwoTargetId
        : gameData.playerOneTargetId;

    const gameRef = ref(database, `games/${id}`);

    if (finalGuess.id === myTargetId) {
      // Correct guess - player wins!
      update(gameRef, {
        gamePhase: "finished",
        winner: selectedRole,
        winnerGuess: finalGuess.id,
      });

      toast({
        title: "🎉 You Won!",
        description: `Congratulations! ${finalGuess.name} was indeed your opponent's target!`,
      });
    } else {
      // Wrong guess - opponent wins!
      const opponent = selectedRole === "playerOne" ? "playerTwo" : "playerOne";
      update(gameRef, {
        gamePhase: "finished",
        winner: opponent,
        winnerGuess: finalGuess.id,
      });

      toast({
        title: "😞 Wrong Guess!",
        description: `${finalGuess.name} was not your opponent's target. You lose!`,
        variant: "destructive",
      });
    }

    setShowGuessDialog(false);
    setFinalGuess(null);
  };

  const nextTurn = () => {
    if (!gameData || !selectedRole) return;

    // Check if it's this player's turn
    if (gameData.currentTurn !== selectedRole) {
      toast({
        title: "Not your turn",
        description: "Wait for the other player to finish their turn.",
        variant: "destructive",
      });
      return;
    }

    // Switch turns
    const nextTurn =
      gameData.currentTurn === "playerOne" ? "playerTwo" : "playerOne";

    const gameRef = ref(database, `games/${id}`);
    update(gameRef, { currentTurn: nextTurn });
  };

  const copyGameId = () => {
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);

    toast({
      title: "Game ID copied",
      description: "Share this ID with your friend to join the game.",
    });
  };

  const resetGame = async () => {
    const gameRef = ref(database, `games/${id}`);

    try {
      // Reset all players to uncrossed
      const initialBoard: Record<string, { crossed: boolean }> = {};
      players.forEach((player) => {
        initialBoard[player.id] = { crossed: false };
      });

      await update(gameRef, {
        playerOneBoard: initialBoard,
        playerTwoBoard: initialBoard,
        currentTurn: "playerOne",
        gamePhase: "playing",
        winner: null,
        winnerGuess: null,
      });

      toast({
        title: "Game reset",
        description: "The game board has been reset.",
      });
    } catch (error) {
      console.error("Error resetting game:", error);
      toast({
        title: "Error",
        description: "Failed to reset the game.",
        variant: "destructive",
      });
    }
  };

  const getPlayer = (playerId: string) => {
    return players.find((p) => p.id === playerId);
  };

  const getMyBoard = () => {
    if (!gameData || !selectedRole) return {};
    return gameData[`${selectedRole}Board` as keyof GameData] as Record<
      string,
      { crossed: boolean }
    >;
  };

  const getRemainingPlayers = () => {
    const myBoard = getMyBoard();
    return players.filter(
      (player) =>
        !myBoard[player.id]?.crossed &&
        player.id !== gameData?.playerOneId &&
        player.id !== gameData?.playerTwoId
    );
  };

  const getCrossedCount = () => {
    const myBoard = getMyBoard();
    const eligiblePlayers = players.filter(
      (player) =>
        player.id !== gameData?.playerOneId &&
        player.id !== gameData?.playerTwoId
    );
    return eligiblePlayers.filter((player) => myBoard[player.id]?.crossed)
      .length;
  };

  const getOpponent = () => {
    if (!gameData || !selectedRole) return null;
    const opponentId =
      selectedRole === "playerOne"
        ? gameData.playerTwoId
        : gameData.playerOneId;
    return getPlayer(opponentId);
  };

  const getMyPlayer = () => {
    if (!gameData || !selectedRole) return null;
    const myId =
      selectedRole === "playerOne"
        ? gameData.playerOneId
        : gameData.playerTwoId;
    return getPlayer(myId);
  };

  const getMyTarget = () => {
    if (!gameData || !selectedRole) return null;
    const targetId =
      selectedRole === "playerOne"
        ? gameData.playerTwoTargetId
        : gameData.playerOneTargetId;
    return targetId ? getPlayer(targetId) : null;
  };

  const getOpponentTarget = () => {
    if (!gameData || !selectedRole) return null;
    const targetId =
      selectedRole === "playerOne"
        ? gameData.playerOneTargetId
        : gameData.playerTwoTargetId;
    return targetId ? getPlayer(targetId) : null;
  };

  const getAvailableTargets = () => {
    if (!gameData) return [];
    const otherRole = selectedRole === "playerOne" ? "playerTwo" : "playerOne";
    const otherTargetId = gameData[
      `${otherRole}TargetId` as keyof GameData
    ] as string;

    return players.filter(
      (player) =>
        player.id !== gameData.playerOneId &&
        player.id !== gameData.playerTwoId &&
        player.id !== otherTargetId
    );
  };

  const hasMyTargetBeenSelected = () => {
    if (!gameData || !selectedRole) return false;
    const myTargetKey = `${selectedRole}TargetId`;
    return !!gameData[myTargetKey as keyof GameData];
  };

  const hasOpponentSelectedTarget = () => {
    if (!gameData || !selectedRole) return false;
    const otherRole = selectedRole === "playerOne" ? "playerTwo" : "playerOne";
    const otherTargetKey = `${otherRole}TargetId`;
    return !!gameData[otherTargetKey as keyof GameData];
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-8 flex justify-center items-center min-h-[50vh]">
        <p>Loading game...</p>
      </div>
    );
  }

  if (!gameData) {
    return (
      <div className="container mx-auto p-4 md:p-8">
        <h1 className="text-3xl font-bold mb-6">Game Not Found</h1>
        <p>This game doesn't exist or has been deleted.</p>
        <Link href="/games">
          <Button className="mt-4">
            <Home className="mr-2 h-4 w-4" /> Back to Games
          </Button>
        </Link>
      </div>
    );
  }

  const playerOne = getPlayer(gameData.playerOneId);
  const playerTwo = getPlayer(gameData.playerTwoId);
  const myBoard = getMyBoard();
  const opponent = getOpponent();
  const myPlayer = getMyPlayer();
  const myTarget = getMyTarget();
  const opponentTarget = getOpponentTarget();
  const remainingPlayers = getRemainingPlayers();

  // Game Setup Phase - Select Role
  if (gameData.gamePhase === "setup" || !selectedRole) {
    return (
      <div className="container mx-auto p-4 md:p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Game Setup</h1>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={copyGameId}>
              {copied ? (
                <Check className="h-4 w-4 mr-2" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              {id.substring(0, 8)}...
            </Button>
            <Link href="/games">
              <Button variant="outline">
                <Home className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Game Info */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className="text-center">
                  <Avatar className="h-12 w-12 mx-auto mb-2">
                    {playerOne?.imageUrl ? (
                      <AvatarImage
                        src={playerOne.imageUrl || "/placeholder.svg"}
                        alt={playerOne.name}
                      />
                    ) : (
                      <AvatarFallback>
                        {playerOne?.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <p className="text-sm font-medium">
                    {playerOne?.nickname || playerOne?.name}
                  </p>
                  <p className="text-xs text-muted-foreground">Player One</p>
                </div>
                <div className="text-2xl font-bold">VS</div>
                <div className="text-center">
                  <Avatar className="h-12 w-12 mx-auto mb-2">
                    {playerTwo?.imageUrl ? (
                      <AvatarImage
                        src={playerTwo.imageUrl || "/placeholder.svg"}
                        alt={playerTwo.name}
                      />
                    ) : (
                      <AvatarFallback>
                        {playerTwo?.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <p className="text-sm font-medium">
                    {playerTwo?.nickname || playerTwo?.name}
                  </p>
                  <p className="text-xs text-muted-foreground">Player Two</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Select Your Role</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={() => selectRole("playerOne")}
                className="h-20 text-lg"
              >
                {playerOne?.nickname || playerOne?.name}
              </Button>
              <Button
                onClick={() => selectRole("playerTwo")}
                className="h-20 text-lg"
              >
                {playerTwo?.nickname || playerTwo?.name}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Target Selection Phase
  if (gameData.gamePhase === "target-selection") {
    return (
      <div className="container mx-auto p-4 md:p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Target Selection</h1>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={copyGameId}>
              {copied ? (
                <Check className="h-4 w-4 mr-2" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              {id.substring(0, 8)}...
            </Button>
            <Link href="/games">
              <Button variant="outline">
                <Home className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Choose Your Opponent's Target</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                You are {myPlayer?.nickname || myPlayer?.name}. Choose a target
                for {opponent?.nickname || opponent?.name} to find by
                elimination.
              </p>

              {!hasMyTargetBeenSelected() ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="target">
                      Select Target for {opponent?.nickname || opponent?.name}
                    </Label>
                    <Select
                      value={selectedTarget}
                      onValueChange={setSelectedTarget}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a player for your opponent to find" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableTargets().map((player) => (
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
                              <span>{player.nickname || player.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={selectTarget}
                    disabled={!selectedTarget}
                    className="w-full"
                  >
                    <Target className="mr-2 h-4 w-4" />
                    Set Target for {opponent?.nickname || opponent?.name}
                  </Button>
                </>
              ) : (
                <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <Check className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-green-700 dark:text-green-300 font-medium">
                    Target Selected!
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    Waiting for {opponent?.nickname || opponent?.name} to choose
                    your target...
                  </p>
                </div>
              )}

              {hasOpponentSelectedTarget() && (
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <Target className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-blue-700 dark:text-blue-300 font-medium">
                    {opponent?.nickname || opponent?.name} has chosen your
                    target!
                  </p>
                </div>
              )}

              <div className="flex justify-center">
                <Button variant="outline" onClick={assignRandomTargets}>
                  <Shuffle className="mr-2 h-4 w-4" />
                  Skip & Use Random Targets
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Game Finished Phase
  if (gameData.gamePhase === "finished") {
    const winner = gameData.winner === selectedRole ? "You" : opponent?.name;
    const isWinner = gameData.winner === selectedRole;
    const guessedPlayer = getPlayer(gameData.winnerGuess || "");
    const actualTarget = getMyTarget();

    return (
      <div className="container mx-auto p-4 md:p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Game Finished</h1>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={copyGameId}>
              {copied ? (
                <Check className="h-4 w-4 mr-2" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              {id.substring(0, 8)}...
            </Button>
            <Link href="/games">
              <Button variant="outline">
                <Home className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        <Card className="mb-6">
          <CardContent className="p-8 text-center">
            <div className="mb-6">
              {isWinner ? (
                <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
              ) : (
                <X className="h-16 w-16 text-red-500 mx-auto mb-4" />
              )}
              <h2
                className={`text-3xl font-bold mb-2 ${
                  isWinner ? "text-green-600" : "text-red-600"
                }`}
              >
                {isWinner ? "🎉 You Won!" : "😞 You Lost!"}
              </h2>
              <p className="text-lg text-muted-foreground mb-4">
                {winner} guessed correctly!
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Final Guess</h3>
                <Avatar className="h-16 w-16 mx-auto mb-2">
                  {guessedPlayer?.imageUrl ? (
                    <AvatarImage
                      src={guessedPlayer.imageUrl || "/placeholder.svg"}
                      alt={guessedPlayer.name}
                    />
                  ) : (
                    <AvatarFallback>
                      {guessedPlayer?.nickname ||
                        guessedPlayer?.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
                <p className="font-medium">
                  {guessedPlayer?.nickname || guessedPlayer?.name}
                </p>
              </div>

              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Your Target Was</h3>
                <Avatar className="h-16 w-16 mx-auto mb-2">
                  {actualTarget?.imageUrl ? (
                    <AvatarImage
                      src={actualTarget.imageUrl || "/placeholder.svg"}
                      alt={actualTarget.name}
                    />
                  ) : (
                    <AvatarFallback>
                      {actualTarget?.nickname ||
                        actualTarget?.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
                <p className="font-medium">
                  {actualTarget?.nickname || actualTarget?.name}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Playing Phase
  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Vem där?</h1>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={copyGameId}>
            {copied ? (
              <Check className="h-4 w-4 mr-2" />
            ) : (
              <Copy className="h-4 w-4 mr-2" />
            )}
            {id.substring(0, 8)}...
          </Button>
          <Link href="/games">
            <Button variant="outline">
              <Home className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Game Instructions - Only show on first turn */}
      {getCrossedCount() === 0 && (
        <Card className="mb-6 border-orange-200 bg-orange-50 dark:bg-orange-950/20">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-orange-800 dark:text-orange-200 mb-1">
                  How to Play
                </h3>
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  Cross off players to eliminate them. When only one player
                  remains, you'll be asked if that's your final guess for your
                  opponent's target. Guess correctly to win!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        {/* Opponent's Target - Right side */}
        {opponentTarget && (
          <Card className="w-full lg:w-80 border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3 row">
                <div className="relative">
                  <Avatar className="h-12 w-12 border-4 border-purple-400">
                    {opponentTarget.imageUrl ? (
                      <AvatarImage
                        src={opponentTarget.imageUrl || "/placeholder.svg"}
                        alt={opponentTarget.name}
                      />
                    ) : (
                      <AvatarFallback className="text-sm font-bold">
                        {opponentTarget.nickname ||
                          opponentTarget.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="absolute -top-1 -right-1 bg-purple-500 text-white rounded-full p-1">
                    <Crown className="h-3 w-3" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold">
                    {opponentTarget.nickname || opponentTarget.name}
                  </h3>

                  <p className="text-xs text-purple-600 dark:text-purple-400">
                    They're looking for this player
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Game Status */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <p className="text-muted-foreground">
            {gameData.currentTurn === selectedRole
              ? "🟢 Your turn"
              : "⏳ Waiting for opponent"}
          </p>
          <p className="text-sm text-muted-foreground">
            Eliminated: {getCrossedCount()} players • Remaining:{" "}
            {remainingPlayers.length} players
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={nextTurn}
            disabled={gameData.currentTurn !== selectedRole}
          >
            End Turn
          </Button>
        </div>
      </div>

      {/* Game Board - All Players */}
      <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 sm:gap-3 md:gap-4">
        {players.map((player) => {
          const isAnimating = animatingPlayer === player.id;
          const isCrossed = myBoard[player.id]?.crossed || false;
          const isGamePlayer =
            player.id === gameData.playerOneId ||
            player.id === gameData.playerTwoId;

          // Don't show game players in the elimination grid
          if (isGamePlayer) return null;

          return (
            <Card
              key={player.id}
              className={`cursor-pointer transition-all duration-300 transform ${
                isAnimating ? "scale-110 rotate-3" : ""
              } ${
                isCrossed
                  ? "bg-red-100 dark:bg-red-900/20 border-red-300 dark:border-red-700"
                  : "hover:bg-accent/50 hover:scale-105"
              }`}
              onClick={() => togglePlayerCrossed(player.id)}
            >
              <CardContent className="p-1 sm:p-2 md:p-1 flex flex-col items-center justify-center text-center relative">
                <div
                  className="w-full h-24 sm:h-28 md:h-32 rounded-lg overflow-hidden relative"
                  style={{
                    backgroundImage: player.imageUrl
                      ? `url(${player.imageUrl})`
                      : "none",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-1 sm:p-2">
                    <p
                      className={`text-xs sm:text-sm md:text-base font-medium text-white transition-all duration-300 truncate w-full ${
                        isCrossed ? "line-through opacity-50" : ""
                      }`}
                      title={player.nickname || player.name}
                    >
                      {player.nickname || player.name.split(" ")[0]}
                    </p>
                  </div>

                  {/* Cross overlay */}
                  {isCrossed && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <X
                        className="h-6 w-6 sm:h-8 sm:w-8 md:h-12 md:w-12 animate-pulse text-red-500"
                        strokeWidth={3}
                      />
                    </div>
                  )}

                  {/* Animation overlay */}
                  {isAnimating && (
                    <div className="absolute inset-0 bg-yellow-200/50 dark:bg-yellow-500/20 rounded-lg animate-pulse" />
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Final Guess Dialog */}
      <AlertDialog open={showGuessDialog} onOpenChange={setShowGuessDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-orange-500" />
              <span>Final Guess</span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              You're about to eliminate another player, leaving only one
              remaining. Are you sure <strong>{finalGuess?.name}</strong> is
              your opponent's target?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-center my-4">
            <div className="text-center">
              <Avatar className="h-16 w-16 mx-auto mb-2">
                {finalGuess?.imageUrl ? (
                  <AvatarImage
                    src={finalGuess.imageUrl || "/placeholder.svg"}
                    alt={finalGuess.name}
                  />
                ) : (
                  <AvatarFallback className="text-lg">
                    {finalGuess?.nickname ||
                      finalGuess?.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
              <p className="font-semibold">
                {finalGuess?.nickname || finalGuess?.name}
              </p>
              <p className="text-sm text-muted-foreground">Your final guess</p>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setFinalGuess(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={makeGuess}
              className="bg-green-600 hover:bg-green-700"
            >
              Yes, this is my guess!
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <style jsx>{`
        @keyframes crossOut {
          0% {
            transform: scale(1) rotate(0deg);
          }
          50% {
            transform: scale(1.1) rotate(5deg);
          }
          100% {
            transform: scale(1) rotate(0deg);
          }
        }

        .cross-animation {
          animation: crossOut 0.6s ease-in-out;
        }
      `}</style>
    </div>
  );
}
