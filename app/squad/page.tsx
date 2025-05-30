"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { database } from "@/lib/firebase"
import { ref, push, onValue, remove, update } from "firebase/database"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Trash2, Edit, Check, X, Upload, Loader2, ImageIcon } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Player {
  id: string
  name: string
  imageUrl?: string
}

export default function SquadPage() {
  const { toast } = useToast()
  const [players, setPlayers] = useState<Player[]>([])
  const [name, setName] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)
  const [editName, setEditName] = useState("")
  const [editImageUrl, setEditImageUrl] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [isEditUploading, setIsEditUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editFileInputRef = useRef<HTMLInputElement>(null)

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
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const addPlayer = () => {
    if (name.trim()) {
      const playersRef = ref(database, "players")
      const newPlayer = {
        name: name.trim(),
        imageUrl: imageUrl.trim() || null,
      }

      push(playersRef, newPlayer)
        .then(() => {
          setName("")
          setImageUrl("")
          toast({
            title: "Player added",
            description: `${name} has been added to your squad.`,
          })
        })
        .catch((error) => {
          console.error("Error adding player:", error)
          toast({
            title: "Error",
            description: "Failed to add player. Please try again.",
            variant: "destructive",
          })
        })
    }
  }

  const deletePlayer = (playerId: string, playerName: string) => {
    const playerRef = ref(database, `players/${playerId}`)
    remove(playerRef)
      .then(() => {
        toast({
          title: "Player removed",
          description: `${playerName} has been removed from your squad.`,
        })
      })
      .catch((error) => {
        console.error("Error removing player:", error)
        toast({
          title: "Error",
          description: "Failed to remove player. Please try again.",
          variant: "destructive",
        })
      })
  }

  const startEdit = (player: Player) => {
    setEditingPlayer(player)
    setEditName(player.name)
    setEditImageUrl(player.imageUrl || "")
  }

  const cancelEdit = () => {
    setEditingPlayer(null)
    setEditName("")
    setEditImageUrl("")
  }

  const saveEdit = () => {
    if (!editingPlayer || !editName.trim()) return

    const playerRef = ref(database, `players/${editingPlayer.id}`)
    update(playerRef, {
      name: editName.trim(),
      imageUrl: editImageUrl.trim() || null,
    })
      .then(() => {
        toast({
          title: "Player updated",
          description: `${editName} has been updated.`,
        })
        cancelEdit()
      })
      .catch((error) => {
        console.error("Error updating player:", error)
        toast({
          title: "Error",
          description: "Failed to update player. Please try again.",
          variant: "destructive",
        })
      })
  }

  const uploadImage = async (file: File, isEdit = false) => {
    if (!file) return

    // Check file size (max 32MB as per ImgBB)
    if (file.size > 32 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 32MB.",
        variant: "destructive",
      })
      return
    }

    // Set loading state
    if (isEdit) {
      setIsEditUploading(true)
    } else {
      setIsUploading(true)
    }

    try {
      // Create form data
      const formData = new FormData()
      formData.append("image", file)

      // Upload to ImgBB
      const response = await fetch(`https://api.imgbb.com/1/upload?key=7a67a9e23d265c1164f698dd805fd959`, {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        // Set the image URL
        if (isEdit) {
          setEditImageUrl(data.data.url)
        } else {
          setImageUrl(data.data.url)
        }
        toast({
          title: "Image uploaded",
          description: "Your image has been uploaded successfully.",
        })
      } else {
        throw new Error(data.error?.message || "Upload failed")
      }
    } catch (error) {
      console.error("Error uploading image:", error)
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      })
    } finally {
      // Clear loading state
      if (isEdit) {
        setIsEditUploading(false)
      } else {
        setIsUploading(false)
      }
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = event.target.files?.[0]
    if (file) {
      uploadImage(file, isEdit)
    }
  }

  const triggerFileInput = (isEdit = false) => {
    if (isEdit) {
      editFileInputRef.current?.click()
    } else {
      fileInputRef.current?.click()
    }
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-6">Manage Squad</h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Add New Player</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Player Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter player name" />
            </div>

            <div className="space-y-2">
              <Label>Profile Image</Label>
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <Avatar className="h-16 w-16 border-2 border-muted">
                    {imageUrl ? (
                      <AvatarImage src={imageUrl || "/placeholder.svg"} alt="Preview" />
                    ) : (
                      <AvatarFallback>
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      </AvatarFallback>
                    )}
                  </Avatar>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => triggerFileInput(false)}
                      disabled={isUploading}
                      className="flex-1"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Upload Image
                        </>
                      )}
                    </Button>
                    {imageUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setImageUrl("")}
                        className="text-red-500"
                        size="icon"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <Input
                    id="imageUrl"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="Or paste image URL here"
                  />
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => handleFileChange(e)}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            <Button onClick={addPlayer} disabled={!name.trim() || isUploading}>
              Add Player
            </Button>
          </div>
        </CardContent>
      </Card>

      <h2 className="text-2xl font-semibold mb-4">Squad Players</h2>

      {isLoading ? (
        <p>Loading players...</p>
      ) : players.length === 0 ? (
        <p>No players in the squad yet. Add some players above.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {players.map((player) => (
            <Card key={player.id} className="overflow-hidden">
              <CardContent className="p-4">
                {editingPlayer?.id === player.id ? (
                  // Edit Mode
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      <Avatar className="h-16 w-16 border-2 border-muted">
                        {editImageUrl ? (
                          <AvatarImage src={editImageUrl || "/placeholder.svg"} alt="Preview" />
                        ) : (
                          <AvatarFallback>
                            {editName ? editName.substring(0, 2).toUpperCase() : <ImageIcon className="h-8 w-8" />}
                          </AvatarFallback>
                        )}
                      </Avatar>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`edit-name-${player.id}`}>Name</Label>
                      <Input
                        id={`edit-name-${player.id}`}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Player name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Profile Image</Label>
                      <div className="flex space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => triggerFileInput(true)}
                          disabled={isEditUploading}
                          className="flex-1"
                        >
                          {isEditUploading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="mr-2 h-4 w-4" />
                              Upload Image
                            </>
                          )}
                        </Button>
                        {editImageUrl && (
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setEditImageUrl("")}
                            className="text-red-500"
                            size="icon"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <Input
                        id={`edit-image-${player.id}`}
                        value={editImageUrl}
                        onChange={(e) => setEditImageUrl(e.target.value)}
                        placeholder="Or paste image URL here"
                      />
                      <input
                        type="file"
                        ref={editFileInputRef}
                        onChange={(e) => handleFileChange(e, true)}
                        accept="image/*"
                        className="hidden"
                      />
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        onClick={saveEdit}
                        disabled={!editName.trim() || isEditUploading}
                        size="sm"
                        className="flex-1"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                      <Button onClick={cancelEdit} variant="outline" size="sm" className="flex-1">
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-12 w-12">
                      {player.imageUrl ? (
                        <AvatarImage src={player.imageUrl || "/placeholder.svg"} alt={player.name} />
                      ) : (
                        <AvatarFallback>{player.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-lg font-medium truncate">{player.name}</p>
                      {player.imageUrl && (
                        <p className="text-xs text-muted-foreground truncate" title={player.imageUrl}>
                          {player.imageUrl.substring(0, 30)}...
                        </p>
                      )}
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => startEdit(player)}
                        aria-label={`Edit ${player.name}`}
                      >
                        <Edit className="h-4 w-4 text-blue-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deletePlayer(player.id, player.name)}
                        aria-label={`Delete ${player.name}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
