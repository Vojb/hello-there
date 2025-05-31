"use client";

import { useEffect, useState } from "react";
import { database } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface PlayerStats {
  id: string;
  name: string;
  nickname?: string;
  imageUrl?: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  points: number;
  bestTurns: number | null;
}

export default function LeagueTable() {
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);

  useEffect(() => {
    const statsRef = ref(database, "playerStats");
    const unsubscribe = onValue(statsRef, (snapshot) => {
      const data = snapshot.val();
      const statsList: PlayerStats[] = [];

      if (data) {
        Object.entries(data).forEach(([id, value]) => {
          const stats = value as Omit<PlayerStats, "id">;

          // Validate and correct stats
          const validatedStats = {
            id,
            name: stats.name || "Unknown Player",
            nickname: stats.nickname,
            imageUrl: stats.imageUrl,
            gamesPlayed: stats.gamesPlayed || 0,
            wins: Math.min(stats.wins || 0, stats.gamesPlayed || 0),
            losses: Math.min(stats.losses || 0, stats.gamesPlayed || 0),
            points: (stats.wins || 0) * 4 + (stats.losses || 0), // 4 points per win, 1 point per loss
            bestTurns: stats.bestTurns || null,
          };

          // Ensure wins + losses equals games played
          if (validatedStats.gamesPlayed > 0) {
            if (
              validatedStats.wins + validatedStats.losses !==
              validatedStats.gamesPlayed
            ) {
              validatedStats.wins = Math.min(
                validatedStats.wins,
                validatedStats.gamesPlayed
              );
              validatedStats.losses =
                validatedStats.gamesPlayed - validatedStats.wins;
            }
          }

          statsList.push(validatedStats);
        });
      }

      // Sort by points (descending), then wins (descending), then games played (ascending)
      const sortedStats = statsList.sort((a, b) => {
        // First sort by points
        if (b.points !== a.points) {
          return b.points - a.points;
        }
        // If points are equal, sort by wins
        if (b.wins !== a.wins) {
          return b.wins - a.wins;
        }
        // If wins are equal, sort by games played (fewer games is better)
        return a.gamesPlayed - b.gamesPlayed;
      });
      setPlayerStats(sortedStats);
    });

    return () => unsubscribe();
  }, []);

  return (
    <main className="container mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-8">
        <Link href="/games">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </Link>
        <h1 className="text-4xl font-bold text-center flex-1">League Table</h1>
        <div className="w-[100px]"></div> {/* Spacer for balance */}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Player Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Player</TableHead>
                <TableHead className="text-right">Games</TableHead>
                <TableHead className="text-right">Wins</TableHead>
                <TableHead className="text-right">Losses</TableHead>
                <TableHead className="text-right">Points</TableHead>
                <TableHead className="text-right">Best Turns</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {playerStats.map((player, index) => (
                <TableRow key={player.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="font-medium">
                    {player.nickname || player.name}
                  </TableCell>
                  <TableCell className="text-right">
                    {player.gamesPlayed}
                  </TableCell>
                  <TableCell className="text-right">{player.wins}</TableCell>
                  <TableCell className="text-right">{player.losses}</TableCell>
                  <TableCell className="text-right">{player.points}</TableCell>
                  <TableCell className="text-right">
                    {player.bestTurns === null ? "-" : player.bestTurns}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
