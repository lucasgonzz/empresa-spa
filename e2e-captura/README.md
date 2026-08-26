# e2e-captura — captura de video para el centro de recursos

Pipeline de la **familia B** (`claude-comerciocity/multimedia/produccion_videos.md` §7): tutoriales
con captura de pantalla del sistema y narración de ElevenLabs.

**Esto NO es parte de `e2e/`.** Aquel es el harness de tests; esto es una cámara. Comparte
Playwright y el patrón de `storageState`, nada más.

---

## Metodología aprobada (19/8/2026)

Lucas comparó las dos formas de capturar y eligió **CDP `Page.screencast`**. Los tutoriales
siguientes se graban así.

| | `context.recordVideo` | **CDP screencast** |
|---|---|---|
| Códec / calidad | VP8, bitrate fijo, sin control | JPEG calidad 100 por frame, encode propio |
| FPS | 25 fijos | ~31 real durante el movimiento, se emite a 30 |
| SSIM vs referencia 4K | 0,9779 | **0,9878** |
| PSNR vs referencia 4K | 34,65 dB | **36,36 dB** |
| Peso (77 s) | 9,5 MB | **5,0 MB** |

La referencia de la medición es el screenshot 4K del mismo instante reescalado a 1080p con lanczos
— es el mismo render sin pasar por compresión de video.

---

## Los cuatro pasos

```
1. guion (.md)          → multimedia/tutoriales/NN-*.md, sección "Narración corrida"
2. generar-narracion.js → un MP3 POR BEAT + duraciones.json   (ElevenLabs)
3. grabar-cdp.js        → frames JPEG + fotos 4K + video mudo  (Playwright + CDP)
4. ffmpeg               → video mudo + narración = MP4 final
```

El orden importa: **primero el audio, después el video.** Cada beat de la captura dura exactamente
lo que dura su narración, así el merge final es un pegado directo sin estirar ni recortar nada.
Medido: desviación máxima de 16 ms sobre 77 s.

### 1. Generar la narración

```bash
node e2e-captura/generar-narracion.js <voice_id> "<nombre de la voz>"
```

Parsea la sección "Narración corrida" del guion — **no se copia el texto a mano**, para que el audio
no se pueda desincronizar del guion aprobado. Genera **un MP3 por párrafo/beat**, no un archivo
único: es lo que permite dimensionar las esperas del paso 3.

Después hay que generar `salida-audio/duraciones.json` midiendo cada MP3 con `ffprobe`.

### 2. Grabar

```bash
node e2e-captura/grabar-cdp.js
```

Lee `duraciones.json` y hace durar cada beat lo que dura su narración. Produce:

- `salida-cdp/frames/` — los JPEG crudos del screencast
- `salida-cdp/fotos-4k/` — **un screenshot 3840×2160 por beat** (ver "Zoom" abajo)
- `salida-cdp/video-mudo.mp4` — el video ya encodeado a CFR
- `salida-cdp/beats.json` — timestamps de todos los frames y de cada beat

### 3. Re-encodear sin volver a grabar

```bash
node e2e-captura/rearmar-cdp.js [fps] [crf]
```

Una corrida contra la demo son ~2 minutos. Como `beats.json` guarda el timestamp de cada frame,
este script re-arma la lista y re-encodea con otros parámetros sin volver a capturar.

### 4. Unir con el audio

```bash
ffmpeg -i salida-cdp/video-mudo.mp4 -i salida-final/narracion-completa.wav \
  -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart salida.mp4
```

`-c:v copy`: el video ya está encodeado como queremos, re-encodearlo solo agregaría pérdida.

---

## Zoom: por qué se guardan fotos 4K

§4 del manual exige *"zoom agresivo, obligatorio"* — una tabla densa de ERP a 1080p completo es
ilegible en un celular. Pero un zoom 2× sobre video 1080p pixela.

Por eso `grabar-cdp.js` guarda además **un screenshot 4K por beat**. Remotion usa el video para las
interacciones reales (tipeo, modal abriéndose) y las fotos 4K para los tramos estáticos con zoom,
que es la mayor parte de un tutorial. Es exactamente lo que §7 anticipa:

> Para estados estáticos conviene screenshot en alta y movimiento controlado en Remotion (más
> nítido que video); el video se reserva para las interacciones reales.

---

## Trampas ya resueltas

No re-descubrirlas. Cada una costó una corrida.

1. **El screencast no emite frames con la pantalla quieta.** Chrome manda un frame cuando hay algo
   nuevo; un beat estático de 27 s no genera ninguno y el video corta antes (medido: 50 s de 77).
   Se resuelve clonando el último frame con `tpad=stop_mode=clone` hasta completar la narración.

2. **El demuxer `concat` ignora la duración del último archivo.** Y si lo repetís para compensar
   —que es lo que sugiere la documentación— la entrada repetida hereda la última `duration` y la
   suma otra vez: 103 s en vez de 77. Por eso `tpad`, no repetición.

3. **`deviceScaleFactor` no agranda el screencast.** Los frames salen siempre al tamaño del viewport
   CSS, incluso forzando `Emulation.setDeviceMetricsOverride`. Sí mejora el detalle interno del
   frame (~15 % más de peso, supersampling real). Para 4K hay que ir por `page.screenshot()`, que sí
   lo respeta.

4. **Concatenar MP3 con `-c copy` arrastra el padding del encoder**: ~180 ms de deriva acumulada
   sobre 6 archivos, que corre los beats del final contra la imagen. Hay que concatenar por
   `filter_complex concat`, que decodifica a PCM y lo elimina.

5. **Esperar a que aparezca contenido en pantalla no alcanza.** El listado ya muestra filas con la
   descarga de catálogos todavía en curso, y tocar un campo ahí trabaja con datos a medio cargar.
   Hay que esperar el estado de la descarga de recursos.

---

## Credenciales

**Nunca hardcodeadas, nunca tipeadas a mano.** Se leen de variables de entorno en tiempo de
ejecución, igual que `e2e/auth.setup.js`, y el script falla explícito si faltan:

- `EMPRESA_DEMO_DOC_NUMBER` / `EMPRESA_DEMO_PASSWORD`
- `ELEVENLABS_API_KEY`

⚠️ `setx` no actualiza procesos ya corriendo. Si una variable no se ve, hay que cerrar la aplicación
entera y reabrirla — abrir una pestaña nueva no alcanza.

---

## Estado de los scripts

| Script | Para qué |
|---|---|
| `grabar-cdp.js` | **La captura buena.** Es el que se copia y adapta para cada tutorial nuevo |
| `rearmar-cdp.js` | Re-encodea sin volver a grabar |
| `generar-narracion.js` | ElevenLabs, un MP3 por beat |
| `unir-video-audio.js` | Merge para el pipeline viejo de `recordVideo` (concatena la narración) |
| `grabar-demo-timeado.js` | Captura con `recordVideo` — **superado por `grabar-cdp.js`**, queda como referencia de la comparación |
| `grabar-demo-precio.js` | Primera prueba contra la demo, flujo corto |
| `grabar-precio.js` | Guion completo contra el slot local (`empresa.local:8188`), rama `refractor` |
| `explorar-demo.js`, `explorar-calculo.js` | Exploración de selectores |
| `listar-voces.js`, `buscar-voces-latinas.js` | Catálogo de voces de ElevenLabs |
| `probar-cdp.js` | Medición de fps/peso antes de grabar largo |

---

## Pendientes conocidos

- **Voz.** La cuenta de ElevenLabs estaba en plan Free, que **no deja usar voces de biblioteca por
  API** — ni las argentinas ni la peninsular que ya figuraba en la cuenta. Solo quedan las premade
  inglesas, que con el modelo multilingüe hablan español con acento angloparlante. Lucas está
  contratando plan pago. La voz definitiva es su clon PVC (§6).
- **Datos del artículo.** El artículo del guion necesita costo 10.000 y **sin descuentos ni
  recargos**. El "Bisagra" de la demo tiene costo 1.000 y descuentos cargados, así que los importes
  de pantalla contradicen la narración (riesgo 5 del guion). Hay que crear el artículo dedicado.
- **Remotion.** Sin armar. Es el que pone el zoom, los textos y el cursor sintético.

---

*ComercioCity — familia B — slot s8 — 19/8/2026*
