import { type Connection, connectionSchema } from './schema.ts'

const KEY = 'post-studio:connection'

// Une seule fois par poste : le fichier est gardé dans le navigateur.
// Tout accès est protégé : le stockage peut être bloqué (navigation privée, données effacées).
export function loadConnection(): Connection | null {
  try {
    const text = localStorage.getItem(KEY)
    if (text === null) return null
    const result = connectionSchema.safeParse(JSON.parse(text))
    return result.success ? result.data : null
  } catch {
    return null
  }
}

export function saveConnection(connection: Connection): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(connection))
    return true
  } catch {
    return false
  }
}

/** « Déconnecter » : efface tout ce que l'outil a gardé sur ce poste. */
export function clearAll(): void {
  try {
    for (const key of Object.keys(localStorage))
      if (key.startsWith('post-studio:')) localStorage.removeItem(key)
  } catch {
    // rien à effacer
  }
}

/** « Exporter » : régénère le fichier pour le donner à une collègue. */
export function exportConnection(connection: Connection): Blob {
  return new Blob([`${JSON.stringify(connection, null, 2)}\n`], { type: 'application/json' })
}

/** Télécharge le fichier de connexion (connexion-post-studio.json). */
export function downloadConnection(connection: Connection): void {
  const url = URL.createObjectURL(exportConnection(connection))
  const a = document.createElement('a')
  a.href = url
  a.download = 'connexion-post-studio.json'
  a.click()
  URL.revokeObjectURL(url)
}
