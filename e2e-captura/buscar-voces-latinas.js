// Busca en la biblioteca compartida de ElevenLabs voces stock en espanol LATINOAMERICANO.
// La cuenta solo tiene voces inglesas + Martin Osborne 2 (peninsular), que no sirve para
// un tutorial dirigido a ferreteros argentinos.
//
// NO gasta creditos ni modifica la cuenta: solo consulta el catalogo publico.
// La key se lee de ELEVENLABS_API_KEY en runtime, nunca hardcodeada ni impresa.

const API = 'https://api.elevenlabs.io/v1'

async function main() {
	const key = process.env.ELEVENLABS_API_KEY
	if (!key) throw new Error('Falta ELEVENLABS_API_KEY en el entorno.')

	// Acentos latinoamericanos que nos interesan, en orden de preferencia para un publico argentino.
	const acentos = ['argentine', 'latin_american', 'mexican', 'colombian', 'chilean', 'peruvian']

	for (const acento of acentos) {
		const url = `${API}/shared-voices?language=es&accent=${acento}&page_size=8&sort=trending`
		const res = await fetch(url, { headers: { 'xi-api-key': key } })
		if (!res.ok) {
			console.log(`[${acento}] error ${res.status}: ${(await res.text()).slice(0, 200)}`)
			continue
		}
		const data = await res.json()
		const voces = data.voices || []
		console.log(`\n=== acento="${acento}" -> ${voces.length} resultados ===`)
		for (const v of voces) {
			console.log(
				`- ${v.name} | id=${v.voice_id} | genero=${v.gender} | edad=${v.age} | acento=${v.accent}` +
					` | uso=${v.use_case} | descr=${v.descriptive || '-'} | usos=${v.cloned_by_count || 0}`
			)
		}
	}
}

main().catch((err) => {
	console.error(err.message)
	process.exit(1)
})
