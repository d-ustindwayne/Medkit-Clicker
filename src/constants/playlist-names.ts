// Playlist ids and display names. Pure data so the server setup script can read it too.
// The songs themselves live in the database (see db/schema.sql) and download after a code unlock.
export const PLAYLIST_NAMES: [id: string, name: string][] = [
  ["cup_of_joe", "Cup of Joe"],
  ["love", "Love Songs"],
  ["filipino_rap", "Pinoy Rap"],
  ["favourites", "My Favs"],
  ["lo-fi", "Lo-fi"],
  ["normal", "Everyday"],
];
