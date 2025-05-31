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
import Image from "next/image";
import { useEffect, useState } from "react";
import { database } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";

interface Player {
  id: string;
  name: string;
  nickname?: string;
  imageUrl?: string;
}

export default function Home() {
  const [players, setPlayers] = useState<Player[]>([]);

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

    return () => unsubscribe();
  }, []);

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
          <Card className="transform transition-all duration-300 hover:scale-105 border-border bg-background/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl text-card-foreground">
                Start New Game
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Create a new game and invite your squad
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative h-48 mb-4 rounded-lg overflow-hidden bg-accent/10">
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-lg font-medium text-card-foreground">
                    Create a new game room and share the code with your friends
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
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
              <div className="relative h-48 mb-4 rounded-lg overflow-hidden bg-secondary/10">
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-lg font-medium text-card-foreground">
                    Join your friends' game using their game code
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Link href="/games" className="w-full">
                <Button className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90">
                  Join Game
                </Button>
              </Link>
            </CardFooter>
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
