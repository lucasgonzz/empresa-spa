import Recorder from 'opus-recorder'

/*
  Ruta del worker del encoder. En admin-spa esta linea es
  `import encoderPath from 'opus-recorder/dist/encoderWorker.min.js?url'`, que es sintaxis de
  Vite: el sufijo ?url le pide al bundler la URL final del archivo. Webpack no lo entiende, asi
  que aca el worker va como estatico: esta copiado en public/opus/encoderWorker.min.js y la ruta
  se escribe literal.

  Es UN SOLO archivo: en opus-recorder 8 el WASM del encoder viene inlineado adentro de ese .js
  (por eso no existe ningun encoderWorker.min.wasm al lado que haya que copiar tambien).

  Y tiene que ser ABSOLUTA desde el host, no relativa: el Worker se instancia con esta URL y una
  ruta relativa se resolveria contra la del navegador, asi que abriendo /whatsapp/123 apuntaria a
  /whatsapp/opus/encoderWorker.min.js y el encoder no cargaria nunca.
*/
const encoderPath = '/opus/encoderWorker.min.js'

/**
 * Graba audio directamente a Ogg/Opus real usando WebAssembly (librería opus-recorder),
 * en lugar de depender de qué formato soporte el MediaRecorder nativo de cada navegador.
 *
 * Por qué existe: Chrome no soporta grabar en audio/ogg nativamente (graba webm), y Safari/iOS
 * graba en fMP4. El backend históricamente re-etiquetaba esos archivos como "audio/ogg" sin
 * convertir el contenedor real, lo cual Meta rechaza con el error 131053 ("mimetype ogg pero
 * el contenido no es ogg"). Con esta librería, el archivo que sale del navegador ya es un
 * .ogg válido byte por byte, sin importar el navegador — no hace falta ninguna conversión
 * server-side.
 *
 * Máquina de estados propia (bug del 3/8/2026 en iPhone — ver prompt 01 del grupo 323):
 * 'idle' -> 'starting' -> 'recording' -> 'stopping' -> 'idle'. opus-recorder 8.0.5 ignora
 * cualquier stop() pedido mientras su propio estado interno es "loading" (la ventana entre que
 * arranca getUserMedia + la carga del WASM del encoder y que resuelve la promesa de start()) —
 * es un no-op silencioso. Si un stop() llega en ese momento, la intención queda anotada
 * (_stop_requested) y se ejecuta recién cuando el start() resuelve, en vez de perderse.
 *
 * Garantía dura: para todo start() que se llega a disparar, tarde o temprano sale exactamente
 * uno de los dos callbacks — onData (con el blob) u onError —, nunca ninguno de los dos y nunca
 * los dos. Eso es lo que evita que la interfaz quede colgada en "grabando" para siempre.
 *
 * Uso:
 *   const recorder = new OggOpusRecorder({
 *     onData: (blob) => { ... },   // blob tipo 'audio/ogg', se llama una vez al detener
 *     onError: (err) => { ... },   // permiso denegado, error al iniciar, o cierre que no confirmó
 *     minDurationMs: 700,          // duración mínima real de grabación antes de cerrar (default 700)
 *     stopTimeoutMs: 4000,         // cuánto se espera la confirmación de cierre (default 4000)
 *   })
 *   recorder.start()  // DEBE llamarse desde un gesto de usuario (click/touch), si no falla en Safari
 *   recorder.stop()   // corta y guarda
 *   recorder.cancel() // corta y descarta -- nunca llama a onData
 */
export class OggOpusRecorder {
  constructor(options) {
    const opts = options || {}
    this._on_data = opts.onData || function () {}
    this._on_error = opts.onError || function () {}
    this._min_duration_ms = typeof opts.minDurationMs === 'number' ? opts.minDurationMs : 700
    this._stop_timeout_ms = typeof opts.stopTimeoutMs === 'number' ? opts.stopTimeoutMs : 4000

    this._recorder = null
    this._state = 'idle'
    this._stop_requested = false
    this._discard = false
    this._recording_since = 0
    this._min_duration_timer = null
    this._stop_timeout_timer = null
  }

  /**
   * @returns {boolean} true si el navegador puede grabar con esta librería.
   */
  static isSupported() {
    try {
      return !!Recorder.isRecordingSupported()
    } catch (err) {
      return false
    }
  }

  /**
   * Estado actual del grabador.
   *
   * @returns {'idle'|'starting'|'recording'|'stopping'}
   */
  get state() {
    return this._state
  }

  /**
   * @returns {boolean} true si hay una grabación en curso (en cualquiera de sus tres estados
   * no-idle) -- útil para decidir si un toque nuevo debe alternar o esperar.
   */
  is_active() {
    return this._state !== 'idle'
  }

  /**
   * Inicia una nueva grabación. Debe llamarse desde un gesto de usuario.
   *
   * @returns {Promise<void>}
   */
  start() {
    const self = this
    if (this._state !== 'idle') {
      return Promise.resolve()
    }
    this._state = 'starting'
    this._stop_requested = false
    this._discard = false

    const recorder = new Recorder({
      encoderPath: encoderPath,
      numberOfChannels: 1,
      encoderSampleRate: 16000, // igual a lo que ya usaba la conversion ffmpeg para notas de voz
      encoderApplication: 2048, // 2048 = optimizado para voz (vs 2049 audio general)
      encoderBitRate: 32000,
    })

    recorder.ondataavailable = function (typed_array) {
      // Guarda contra una confirmacion tardia: si el encoder tarda mas que
      // stopTimeoutMs en flushear, _force_release() ya corrio por el reloj de
      // seguridad y ya se aviso onError. Si ademas ya hay un start() nuevo en
      // curso, este "done" viejo no le pertenece -- sin esto se colaria un
      // onData de mas (violando la garantia de "nunca los dos") o cerraria la
      // grabacion siguiente por error.
      if (self._recorder !== recorder) {
        return
      }
      // El orden importa: el consumidor puede pedir una grabacion nueva desde
      // adentro de onData, y tiene que encontrar el wrapper en 'idle'. Por eso
      // se libera (cierra + vuelve a 'idle') ANTES de llamar a on_data.
      const era_descarte = self._discard
      self._force_release()
      if (!era_descarte) {
        const blob = new Blob([typed_array], { type: 'audio/ogg' })
        self._on_data(blob)
      }
    }

    this._recorder = recorder
    return recorder
      .start()
      .then(function () {
        // Aca opus-recorder ya esta en "recording" (lo pone el antes de resolver).
        self._recording_since = Date.now()
        if (self._stop_requested) {
          self._stop_requested = false
          self._begin_stop()
          return
        }
        self._state = 'recording'
      })
      .catch(function (err) {
        self._force_release()
        self._on_error(err)
        throw err
      })
  }

  /**
   * Detiene la grabación activa y guarda lo grabado. El blob llega de forma asíncrona vía
   * el callback onData. Si se llama mientras el grabador todavía está iniciando, el pedido
   * de corte queda anotado y se ejecuta apenas termine de iniciar -- nunca se pierde.
   *
   * @returns {void}
   */
  stop() {
    if (this._state === 'idle' || this._state === 'stopping') {
      return
    }
    if (this._state === 'starting') {
      /*
        NO llamar a this._recorder.stop() acá, y NO soltar la referencia.

        POR QUE (no "simplificar" esto de vuelta): opus-recorder 8.0.5 ignora stop() mientras su
        estado interno es "loading" -- la ventana entre que arranca getUserMedia + la carga del
        WASM del encoder y que resuelve la promesa de start(). Es un no-op silencioso: no tira,
        no avisa. Si ademas soltabamos this._recorder = null como se hacia antes, el wrapper
        quedaba creyendo que no habia nada activo y CUALQUIER stop() posterior salia por el guard
        de arriba, mientras el microfono seguia grabando para siempre. Eso es exactamente el bug
        del 3/8/2026 en iPhone: en tactil el stop llega ~100 ms despues del start, o sea siempre
        adentro de la ventana de loading, y despues no habia forma de cortar sin recargar.

        Lo correcto es dejar la intencion anotada y ejecutarla cuando el start() resuelva.
      */
      this._stop_requested = true
      return
    }
    this._begin_stop()
  }

  /**
   * Detiene la grabación activa y DESCARTA lo grabado -- nunca llama a onData. Ignora
   * minDurationMs (cancelar tiene que liberar el micrófono ya, no esperar el mínimo). Mismo
   * cuidado que stop() durante 'starting': no toca this._recorder ni suelta la referencia
   * hasta que start() resuelva.
   *
   * @returns {void}
   */
  cancel() {
    if (this._state === 'idle' || this._state === 'stopping') {
      return
    }
    this._discard = true
    if (this._state === 'starting') {
      this._stop_requested = true
      return
    }
    this._begin_stop()
  }

  /**
   * Arranca el cierre: pasa a 'stopping' y, si no es un descarte y todavía falta para llegar
   * a minDurationMs, posterga el cierre real hasta cumplirlo (un toque corto no puede producir
   * un .ogg de milisegundos que Meta rechace).
   *
   * @returns {void}
   */
  _begin_stop() {
    const self = this
    this._state = 'stopping'

    if (this._discard) {
      this._do_stop()
      return
    }

    const transcurrido = Date.now() - this._recording_since
    const falta = this._min_duration_ms - transcurrido
    if (falta > 0) {
      this._min_duration_timer = setTimeout(function () {
        self._min_duration_timer = null
        self._do_stop()
      }, falta)
      return
    }
    this._do_stop()
  }

  /**
   * Pide el cierre real a la librería, con un reloj de seguridad: si la confirmación
   * (ondataavailable) no llega en stopTimeoutMs, la grabación se da por perdida, se libera
   * todo a la fuerza y se avisa por onError -- así la interfaz nunca queda colgada en
   * "grabando" esperando algo que no va a llegar.
   *
   * @returns {void}
   */
  _do_stop() {
    const self = this

    this._stop_timeout_timer = setTimeout(function () {
      const era_descarte = self._discard
      self._force_release()
      if (!era_descarte) {
        self._on_error(new Error('La grabación no se pudo cerrar. Volvé a intentar.'))
      }
    }, this._stop_timeout_ms)

    try {
      this._recorder.stop()
    } catch (err) {
      const era_descarte = self._discard
      self._force_release()
      if (!era_descarte) {
        self._on_error(err)
      }
    }
  }

  /**
   * Libera todo incondicionalmente: cierra el recorder (apaga el micrófono de verdad --
   * close() corre clearStream() y detiene los tracks), suelta la referencia, vuelve a 'idle'
   * y limpia los dos timers. Es la ÚNICA forma de soltar this._recorder fuera del
   * ondataavailable normal.
   *
   * @returns {void}
   */
  _force_release() {
    if (this._recorder) {
      try {
        this._recorder.close()
      } catch (err) {
        /* noop */
      }
    }
    this._recorder = null
    this._state = 'idle'
    this._recording_since = 0
    this._clear_timers()
  }

  /**
   * @returns {void}
   */
  _clear_timers() {
    if (this._min_duration_timer) {
      clearTimeout(this._min_duration_timer)
      this._min_duration_timer = null
    }
    if (this._stop_timeout_timer) {
      clearTimeout(this._stop_timeout_timer)
      this._stop_timeout_timer = null
    }
  }
}

export default OggOpusRecorder
