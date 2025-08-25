// db.js
import Dexie from 'dexie'

// Creamos la base de datos "OfflineDB"
const db = new Dexie('OfflineDB')

// Definimos las tablas y sus índices
db.version(4).stores({
    // Guardamos artículos con ID como clave primaria
    articles: 'id, name, provider_code',

    // Guardamos ventas con ID autoincremental y una bandera "synced"
    sales: '++id, created_at',

    meta: '&key' // clave primaria es "key"
})

export default db
