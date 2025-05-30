"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { database } from "@/lib/firebase"
import { ref, push, onValue } from "firebase/database"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowRight, Plus, Shuffle, Target } from "lucide-react"

interface Player {
  id: string
  name: string
  imageUrl?: string
}

interface Game {
  id: string
  createdAt: number
  playerOneId: string
  playerTwoId: string
  targetMode: "select" | "random"
  gamePhase: "setup" | "target-selection" | "playing"
}

export default function GamesPage() {
  const router = useRouter()
  const [games, setGames] = useState<Game[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [gameId, setGameId] = useState("")
  const [selectedPlayerOne, setSelectedPlayerOne] = useState("")
  const [selectedPlayerTwo, setSelectedPlayerTwo] = useState("")
  const [targetMode, setTargetMode] = useState<"select" | "random">("select")
  const [isLoading, setIsLoading] = useState(true)

  // Load games
  useEffect(() => {
    const gamesRef = ref(database, "games")

    const unsubscribe = onValue(gamesRef, (snapshot) => {
      const data = snapshot.val()
      const gamesList: Game[] = []

      if (data) {
        Object.entries(data).forEach(([id, value]) => {
          const game = value as {
            createdAt: number
            playerOneId: string
            playerTwoId: string
            targetMode?: "select" | "random"
            gamePhase?: "setup" | "target-selection" | "playing"
          }
          gamesList.push({
            id,
            createdAt: game.createdAt,
            playerOneId: game.playerOneId,
            playerTwoId: game.playerTwoId,
            targetMode: game.targetMode || "select",
            gamePhase: game.gamePhase || "setup",
          })
        })
      }

      // Sort games by creation time (newest first)
      gamesList.sort((a, b) => b.createdAt - a.createdAt)

      setGames(gamesList)
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Load players
  useEffect(() => {
    const playersRef = ref(database, "players")

    const unsubscribe = onValue(playersRef, (snapshot) => {
      const data = snapshot.val()
      const playersList: Player[] = []

      if (data) {
        Object.entries(data).forEach(([id, value]) => {
          const player = value as { name: string; imageUrl?: string }
          playersList.push({
            id,
            name: player.name,
            imageUrl: player.imageUrl,
          })
        })
      }

      setPlayers(playersList)
    })

    return () => unsubscribe()
  }, [])

  const createNewGame = async () => {
    if (!selectedPlayerOne || !selectedPlayerTwo) {
      return
    }

    if (selectedPlayerOne === selectedPlayerTwo) {
      return
    }

    const gamesRef = ref(database, "games")

    // Create initial board state with all players
    const initialBoard: Record<string, { crossed: boolean }> = {}
    players.forEach((player) => {
      initialBoard[player.id] = { crossed: false }
    })

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
    }

    try {
      const gameRef = await push(gamesRef, newGame)
      if (gameRef.key) {
        router.push(`/games/${gameRef.key}`)
      }
    } catch (error) {
      console.error("Error creating game:", error)
    }
  }

  const joinGame = () => {
    if (gameId.trim()) {
      router.push(`/games/${gameId.trim()}`)
    }
  }

  const getPlayerName = (playerId: string) => {
    const player = players.find((p) => p.id === playerId)
    return player ? player.name : "Unknown Player"
  }

  const getGamePhaseText = (phase: string) => {
    switch (phase) {
      case "setup":
        return "Waiting for players"
      case "target-selection":
        return "Selecting targets"
      case "playing":
        return "In progress"
      default:
        return "Unknown"
    }
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-6">Games</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Create New Game</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="playerOne">Player One</Label>
                <Select value={selectedPlayerOne} onValueChange={setSelectedPlayerOne}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Player One" />
                  </SelectTrigger>
                  <SelectContent>
                    {players.map((player) => (
                      <SelectItem key={player.id} value={player.id}>
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-6 w-6">
                            {player.imageUrl ? (
                              <AvatarImage src={player.imageUrl || "/placeholder.svg"} alt={player.name} />
                            ) : (
                              <AvatarFallback className="text-xs">
                                {player.name.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <span>{player.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="playerTwo">Player Two</Label>
                <Select value={selectedPlayerTwo} onValueChange={setSelectedPlayerTwo}>
                  <SelectTrigger>
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
                                <AvatarImage src={player.imageUrl || "/placeholder.svg"} alt={player.name} />
                              ) : (
                                <AvatarFallback className="text-xs">
                                  {player.name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <span>{player.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Target Selection Mode */}
              <div className="space-y-2">
                <Label>Target Selection Mode</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={targetMode === "select" ? "default" : "outline"}
                    onClick={() => setTargetMode("select")}
                    className="h-12"
                  >
                    <Target className="mr-2 h-4 w-4" />
                    Choose Targets
                  </Button>
                  <Button
                    variant={targetMode === "random" ? "default" : "outline"}
                    onClick={() => setTargetMode("random")}
                    className="h-12"
                  >
                    <Shuffle className="mr-2 h-4 w-4" />
                    Random Targets
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {targetMode === "select"
                    ? "Players will choose targets after joining the game"
                    : "Targets will be randomly assigned when both players join"}
                </p>
              </div>

              <Button
                onClick={createNewGame}
                disabled={
                  !selectedPlayerOne ||
                  !selectedPlayerTwo ||
                  selectedPlayerOne === selectedPlayerTwo ||
                  players.length === 0
                }
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" /> Create Game
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Join Existing Game</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gameId">Game ID</Label>
                <div className="flex space-x-2">
                  <Input
                    id="gameId"
                    value={gameId}
                    onChange={(e) => setGameId(e.target.value)}
                    placeholder="Enter game ID"
                  />
                  <Button onClick={joinGame} disabled={!gameId.trim()}>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-2xl font-semibold mb-4">Recent Games</h2>

      {isLoading ? (
        <p>Loading games...</p>
      ) : games.length === 0 ? (
        <p>No games created yet. Create a new game to get started.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {games.map((game) => (
            <Card
              key={game.id}
              className="hover:bg-accent/50 cursor-pointer"
              onClick={() => router.push(`/games/${game.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">Game ID: {game.id.substring(0, 8)}...</p>
                    <p className="text-sm text-muted-foreground">
                      {getPlayerName(game.playerOneId)} vs {getPlayerName(game.playerTwoId)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Mode: {game.targetMode === "select" ? "Choose Targets" : "Random Targets"}
                    </p>
                    <p className="text-xs text-muted-foreground">Status: {getGamePhaseText(game.gamePhase)}</p>
                    <p className="text-xs text-muted-foreground">
                      Created: {new Date(game.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
