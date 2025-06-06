import { ref } from "firebase/database";
import { database } from "./firebase";

export const BASE_PATH = "fcm/";
const PLAYERS = "players";
export const GAMES = "games";
const PLAYER_STATS = "playerStats";

export const playersRef = () => ref(database, BASE_PATH + PLAYERS);
export const gamesRef = () => ref(database, BASE_PATH + GAMES);
export const playerStatsRef = () => ref(database, BASE_PATH + PLAYER_STATS);

// Add more references as needed
