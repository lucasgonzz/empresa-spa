// Lista las voces disponibles en la cuenta de ElevenLabs para elegir una stock en espanol
// latinoamericano. NO gasta creditos: solo consulta el catalogo.
//
// La key SIEMPRE se lee de la variable de entorno ELEVENLABS_API_KEY en tiempo de ejecucion,
// nunca hardcodeada y nunca impresa.

const API = 'https://api.elevenlabs.io/v1'

async function main() {
	const key = process.env.ELEVENLABS_API_KEY
	if (!key) throw new Error('Falta ELEVENLABS_API_KEY en el entorno.')

	// Estado de la suscripcion: informativo. La key de Lucas tiene permisos acotados y puede no
	// tener user_read -- si falla, no importa, seguimos igual.
	const sub = await fetch(`${API}/user/subscription`, { headers: { 'xi-api-key': key } })
	if (sub.ok) {
		const s = await sub.json()
		console.log('Plan:', s.tier, '| caracteres:', s.character_count, '/', s.character_limit)
	} else {
		console.log('(sin permiso user_read para ver creditos, sigo)')
	}

	const res = await fetch(`${API}/voices`, { headers: { 'xi-api-key': key } })
	if (!res.ok) throw new Error(`Error listando voces: ${res.status} ${await res.text()}`)
	const data = await res.json()

	console.log('\nTotal de voces:', data.voices.length)
	console.log('\n--- Voces con espanol / latino en sus etiquetas ---')
	for (const v of data.voices) {
		const labels = v.labels || {}
		const texto = JSON.stringify(labels).toLowerCase() + ' ' + (v.name || '').toLowerCase() + ' ' + (v.description || '').toLowerCase()
		const es_candidata = texto.includes('spanish') || texto.includes('espa') || texto.includes('latin') || texto.includes('mexic') || texto.includes('argent')
		if (es_candidata) {
			console.log(`- ${v.name} | id=${v.voice_id} | categoria=${v.category} | labels=${JSON.stringify(labels)}`)
		}
	}

	console.log('\n--- Todas las voces (nombre / categoria / labels) ---')
	for (const v of data.voices) {
		console.log(`- ${v.name} | id=${v.voice_id} | categoria=${v.category} | labels=${JSON.stringify(v.labels || {})}`)
	}
}

main().catch((err) => {
	console.error(err.message)
	process.exit(1)
})
