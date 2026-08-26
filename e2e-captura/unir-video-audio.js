// Paso 3 del pipeline de familia B (produccion_videos.md S7): une el footage crudo de Playwright
// con la narracion de ElevenLabs.
//
// El offset del beat 1 NO se hardcodea: se calcula como (duracion del webm - duracion total de la
// narracion). Vale porque el script de captura cierra el contexto inmediatamente despues del beat
// 6, asi que la cola del video coincide con el fin de la narracion y todo lo que sobra al
// principio es la preparacion (login, navegar al listado, esperar la descarga de recursos).
//
// Salida en H.264 crf 16 / preset slow: el material de origen es VP8 25fps y no se le puede
// devolver informacion que no tiene, pero se evita agregar perdida en este paso. La fluidez y el
// zoom los pone Remotion despues, sobre este mismo material.

const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const DIR_VIDEO = path.join(__dirname, 'salida-demo-timeada')
const DIR_AUDIO = path.join(__dirname, 'salida-audio')
const SALIDA = path.join(__dirname, 'salida-final')

function ffprobe_duracion(archivo) {
	const out = execFileSync('ffprobe', [
		'-v', 'error',
		'-show_entries', 'format=duration',
		'-of', 'csv=p=0',
		archivo,
	]).toString().trim()
	return parseFloat(out)
}

function main() {
	fs.mkdirSync(SALIDA, { recursive: true })

	const webm = fs.readdirSync(DIR_VIDEO).find((f) => f.endsWith('.webm'))
	if (!webm) throw new Error(`No hay .webm en ${DIR_VIDEO}`)
	const video = path.join(DIR_VIDEO, webm)

	const duraciones = JSON.parse(fs.readFileSync(path.join(DIR_AUDIO, 'duraciones.json'), 'utf8'))
	const dur_audio = duraciones.reduce((a, d) => a + d.segundos, 0)
	const dur_video = ffprobe_duracion(video)
	const offset = dur_video - dur_audio

	console.log(`Video crudo: ${dur_video.toFixed(2)}s`)
	console.log(`Narracion:   ${dur_audio.toFixed(2)}s (${duraciones.length} beats)`)
	console.log(`Offset del beat 1: ${offset.toFixed(3)}s (preparacion que se descarta)\n`)
	if (offset < 0) throw new Error('El video dura menos que la narracion: revisa la captura.')

	// 1) Concatenar los mp3 por beat en una sola pista.
	//
	// 🔴 NO se usa el demuxer concat con -c copy. Cada mp3 trae padding del encoder al principio y
	// al final, y copiando crudo ese padding se suma: medido, 77.13s en vez de 76.95 -- ~180ms de
	// deriva que corre los beats del final contra la imagen. Concatenando por FILTRO se decodifica
	// a PCM y el padding desaparece. La salida intermedia es WAV para no comprimir dos veces.
	const entradas = []
	for (const d of duraciones) entradas.push('-i', path.join(DIR_AUDIO, d.archivo))
	const n = duraciones.length
	const cadena = duraciones.map((_, i) => `[${i}:a]`).join('') + `concat=n=${n}:v=0:a=1[out]`

	const narracion = path.join(SALIDA, 'narracion-completa.wav')
	console.log('Concatenando la narracion (por filtro, sin padding)...')
	execFileSync('ffmpeg', [
		'-v', 'error', '-y',
		...entradas,
		'-filter_complex', cadena,
		'-map', '[out]',
		'-c:a', 'pcm_s16le', '-ar', '44100',
		narracion,
	])
	const dur_narracion = ffprobe_duracion(narracion)
	console.log(`  -> ${path.basename(narracion)} (${dur_narracion.toFixed(3)}s, esperado ${dur_audio.toFixed(3)}s)`)

	// 2) Recortar la preparacion y pegar el audio.
	const final = path.join(SALIDA, 'tutorial-01-precio.mp4')
	console.log('Uniendo video + audio (H.264 crf 16, esto tarda)...')
	execFileSync(
		'ffmpeg',
		[
			'-v', 'error', '-y',
			'-ss', offset.toFixed(3),
			'-i', video,
			'-i', narracion,
			'-map', '0:v:0',
			'-map', '1:a:0',
			'-c:v', 'libx264', '-crf', '16', '-preset', 'slow', '-pix_fmt', 'yuv420p',
			'-c:a', 'aac', '-b:a', '192k',
			'-shortest',
			'-movflags', '+faststart',
			final,
		],
		{ stdio: 'inherit' }
	)

	const dur_final = ffprobe_duracion(final)
	const peso = (fs.statSync(final).size / 1024 / 1024).toFixed(1)
	console.log(`\nListo: ${final}`)
	console.log(`Duracion: ${dur_final.toFixed(2)}s | peso: ${peso} MB`)

	// Marcas de tiempo de cada beat en el video final, para Remotion.
	let t = 0
	const marcas = duraciones.map((d) => {
		const inicio = t
		t += d.segundos
		return { beat: d.beat, inicio_s: Number(inicio.toFixed(3)), fin_s: Number(t.toFixed(3)) }
	})
	fs.writeFileSync(path.join(SALIDA, 'marcas-beats.json'), JSON.stringify(marcas, null, 2))
	console.log('Marcas por beat en marcas-beats.json')
}

main()
