// Paso 2 del pipeline de familia B (produccion_videos.md S7): genera la narracion con ElevenLabs.
//
// Genera UN MP3 POR BEAT, no un archivo unico. Es a proposito: el paso 3 del pipeline necesita la
// duracion real de cada segmento para dimensionar las esperas del script de Playwright. Un solo
// archivo daria la duracion total y no serviria para timear los beats.
//
// El texto sale de la seccion "Narracion corrida" del guion, parseada del .md -- no se copia a
// mano, para que el audio no se pueda desincronizar del guion aprobado.
//
// Voz: stock argentina de la biblioteca compartida (Lucas pidio stock en espanol latinoamericano;
// argentino es lo que corresponde porque el guion esta escrito en voseo rioplatense). La voz
// definitiva del centro de recursos va a ser el clon PVC de Lucas -- ver S6 del manual.
//
// La key se lee de ELEVENLABS_API_KEY en runtime, nunca hardcodeada ni impresa.

const fs = require('fs')
const path = require('path')

const API = 'https://api.elevenlabs.io/v1'
const GUION = 'C:/cc-worktrees/claude-comerciocity/multimedia/tutoriales/01-cambiar-el-precio-de-un-articulo.md'
const OUT_DIR = path.join(__dirname, 'salida-audio')

// Voz configurable por argumento: node generar-narracion.js <voice_id> <nombre> [--solo-beat-1]
//
// 🔴 La cuenta es plan FREE, y ElevenLabs NO deja usar voces de la biblioteca compartida via API
// en free ("Free users cannot use library voices via the API"). Las voces argentinas que
// buscamos (Ignacio AvFwmpNEfWWu5mtNDqhH, Leandro, Tomas...) quedan bloqueadas hasta que haya
// plan pago. Default provisorio: Martin Osborne 2, la unica voz en espanol que ya esta en la
// cuenta -- pero es acento PENINSULAR (Espana), no rioplatense.
const VOZ_ID = process.argv[2] || 'Vpv1YgvVd6CHIzOTiTt8'
const VOZ_NOMBRE = process.argv[3] || 'Martin Osborne 2 (espanol peninsular)'
const SOLO_BEAT_1 = process.argv.includes('--solo-beat-1')
const MODELO = 'eleven_multilingual_v2'

/**
 * Extrae los parrafos de la seccion "Narracion corrida" del guion.
 * Cada parrafo del blockquote es un beat.
 */
function leer_narracion() {
	const md = fs.readFileSync(GUION, 'utf8')
	const desde = md.indexOf('## Narración corrida')
	if (desde === -1) throw new Error('No encontre la seccion "Narración corrida" en el guion.')
	const hasta = md.indexOf('## Beats', desde)
	const bloque = md.slice(desde, hasta === -1 ? undefined : hasta)

	// Las lineas del blockquote empiezan con "> ". Una linea "> " sola separa parrafos.
	const lineas = bloque.split('\n').filter((l) => l.trimStart().startsWith('>'))
	const parrafos = []
	let actual = []
	for (const l of lineas) {
		const texto = l.trimStart().replace(/^>\s?/, '').trim()
		if (texto === '') {
			if (actual.length) {
				parrafos.push(actual.join(' '))
				actual = []
			}
		} else {
			actual.push(texto)
		}
	}
	if (actual.length) parrafos.push(actual.join(' '))
	return parrafos
}

async function generar_beat(key, numero, texto) {
	const res = await fetch(`${API}/text-to-speech/${VOZ_ID}?output_format=mp3_44100_128`, {
		method: 'POST',
		headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
		body: JSON.stringify({
			text: texto,
			model_id: MODELO,
			voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.0, use_speaker_boost: true },
		}),
	})
	if (!res.ok) {
		throw new Error(`Beat ${numero}: ${res.status} ${(await res.text()).slice(0, 300)}`)
	}
	const buffer = Buffer.from(await res.arrayBuffer())
	const archivo = path.join(OUT_DIR, `beat-${String(numero).padStart(2, '0')}.mp3`)
	fs.writeFileSync(archivo, buffer)
	return { archivo, bytes: buffer.length }
}

async function main() {
	const key = process.env.ELEVENLABS_API_KEY
	if (!key) throw new Error('Falta ELEVENLABS_API_KEY en el entorno.')

	fs.mkdirSync(OUT_DIR, { recursive: true })

	let parrafos = leer_narracion()
	if (SOLO_BEAT_1) {
		parrafos = parrafos.slice(0, 1)
		console.log('(modo --solo-beat-1: prueba de voz, no gasta los 1163 caracteres completos)')
	}
	const total_chars = parrafos.reduce((a, p) => a + p.length, 0)
	console.log(`Beats de narracion encontrados: ${parrafos.length} (${total_chars} caracteres en total)`)
	console.log(`Voz: ${VOZ_NOMBRE} | modelo: ${MODELO}\n`)

	const resultado = []
	for (let i = 0; i < parrafos.length; i++) {
		const numero = i + 1
		const texto = parrafos[i]
		process.stdout.write(`Beat ${numero} (${texto.length} chars)... `)
		const { archivo, bytes } = await generar_beat(key, numero, texto)
		console.log(`OK -> ${path.basename(archivo)} (${(bytes / 1024).toFixed(0)} KB)`)
		resultado.push({ beat: numero, texto, archivo: path.basename(archivo), bytes })
	}

	fs.writeFileSync(path.join(OUT_DIR, 'narracion.json'), JSON.stringify(resultado, null, 2))
	console.log('\nListo. Audio en', OUT_DIR)
}

main().catch((err) => {
	console.error('\nERROR:', err.message)
	process.exit(1)
})
