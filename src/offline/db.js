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

// Nueva versión agregando índice bar_code
db.version(5).stores({
    articles: 'id, name, provider_code, bar_code',
    sales: '++id, created_at',
    meta: '&key'
})

// Nueva versión agregando índice "plu"
db.version(6).stores({
    articles: 'id, name, provider_code, bar_code, plu',
    sales: '++id, created_at',
    meta: '&key'
})

/*
    Clientes para elegir en Vender sin conexión (misión clientes-sin-internet, 26/10/2026). Se
    guardan completos (`Client::withAll()`, lo mismo que trae el buscador con internet) y se buscan
    con src/mixins/model_functions.js::search_clients_offline(). Los índices son los campos por los
    que se busca.

    ⚠️ Subir la versión dispara `versionchange` en las pestañas que todavía tienen el bundle anterior
    abierto. Dexie 4 les cierra la base y la vuelve a abrir sola en el próximo uso (sin versión, ve la
    7): medido leyendo node_modules/dexie (revisión de la misión). Si igual fallara una escritura, desde
    4.3.18 guardar_venta_offline() avisa y deja la venta en pantalla. Las tablas que ya existían quedan
    igual, con sus datos. (La misión ingreso-sin-internet había evitado subir la versión; esta la sube
    porque los clientes necesitan su propia tabla para la descarga incremental.)
*/
db.version(7).stores({
    articles: 'id, name, provider_code, bar_code, plu',
    sales: '++id, created_at',
    meta: '&key',
    clients: 'id, name, num, cuit, dni'
})

export default db
