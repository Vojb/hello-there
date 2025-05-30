import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <main className="container mx-auto p-4 md:p-8">
      <h1 className="text-4xl font-bold text-center mb-8">Squad Game App</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Manage Squad</CardTitle>
            <CardDescription>Add and view players in your squad</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Create your squad by adding players with names and optional profile images.</p>
          </CardContent>
          <CardFooter>
            <Link href="/squad" className="w-full">
              <Button className="w-full">Go to Squad</Button>
            </Link>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Play Game</CardTitle>
            <CardDescription>Create or join a game</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Create a new game or join an existing one with a unique game ID.</p>
          </CardContent>
          <CardFooter>
            <Link href="/games" className="w-full">
              <Button className="w-full">Go to Games</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </main>
  )
}
