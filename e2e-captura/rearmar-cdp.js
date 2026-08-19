// Re-arma la lista de frames y re-encodea el video CDP SIN volver a grabar. Existe porque una
// corrida contra la demo son ~2 minutos y el encode hay que ajustarlo varias veces.
//
// Lee salida-cdp/beats.json (que guarda el timestamp de cada frame) y los .jpg ya capturados.

const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const OUT_DIR = path.join(__dirname, 'salida-cdp')
const FRAMES_DIR = path.join(OUT_DIR, 'frames')
const FPS_SALIDA = Number(process.argv[2] || 30)
const CRF = process.argv[3] || '14'

function duracion(archivo) {
	return parseFloat(
		execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', archivo])
			.toString()
			.trim()
	)
}

function main() {
	const datos = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'beats.json'), 'utf8'))
	const total_ms = datos.total_ms
	const frames = datos.frames.filter((f) => f.ms_local !== null && f.ms_local > 0)

	// 🔴 El ultimo frame NO se repite. El demuxer concat cuenta la entrada repetida como un clip
	// mas y suma su duracion otra vez: medido, 103.4s en vez de 76.95s -- justo el tramo quieto
	// del beat 6 contado dos veces. Con una sola entrada por frame la suma da exacta.
	const lineas = []
	for (let i = 0; i < frames.length; i++) {
		const fin = i < frames.length - 1 ? frames[i + 1].ms_local : total_ms
		const dur = (fin - frames[i].ms_local) / 1000
		if (dur <= 0) continue
		lineas.push(`file '${path.join(FRAMES_DIR, frames[i].archivo).replace(/\\/g, '/')}'`)
		lineas.push(`duration ${dur.toFixed(6)}`)
	}
	const lista = path.join(OUT_DIR, 'lista-frames.txt')
	fs.writeFileSync(lista, lineas.join('\n'))

	// El concat demuxer no respeta la duracion del ULTIMO archivo de la lista: el video corta en el
	// instante en que ese frame aparece. Repetirlo tampoco sirve -- la entrada repetida hereda la
	// ultima `duration` y la suma otra vez (medido: 103.4s en vez de 76.95s).
	//
	// La cola se completa con tpad clonando el ultimo frame. Es determinista: sabemos exactamente
	// donde corta el concat (el ms_local del ultimo frame) y cuanto falta hasta la narracion.
	const corte_s = frames[frames.length - 1].ms_local / 1000
	const cola_s = total_ms / 1000 - corte_s
	console.log(`Frames: ${frames.length} | el concat corta en ${corte_s.toFixed(3)}s | cola a clonar: ${cola_s.toFixed(3)}s`)

	const mudo = path.join(OUT_DIR, 'video-mudo.mp4')
	console.log(`Encodeando a ${FPS_SALIDA} fps, crf ${CRF}...`)
	execFileSync(
		'ffmpeg',
		[
			'-v', 'error', '-y',
			'-f', 'concat', '-safe', '0', '-i', lista,
			'-vf', `fps=${FPS_SALIDA},tpad=stop_mode=clone:stop_duration=${cola_s.toFixed(3)}`,
			'-c:v', 'libx264', '-crf', CRF, '-preset', 'slow', '-pix_fmt', 'yuv420p',
			mudo,
		],
		{ stdio: 'inherit' }
	)
	console.log(`Video mudo: ${duracion(mudo).toFixed(3)}s | ${(fs.statSync(mudo).size / 1024 / 1024).toFixed(1)} MB`)
}

main()
