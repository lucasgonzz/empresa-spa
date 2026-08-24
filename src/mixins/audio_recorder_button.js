import { OggOpusRecorder } from '@/utils/oggOpusRecorder'

/** A partir de acá el gesto se considera "mantener pulsado" en vez de un toque corto. */
const HOLD_THRESHOLD_MS = 400

/**
 * Ventana para ignorar eventos de mouse sintetizados después de un toque. En aparatos híbridos
 * (iPad con trackpad, Android) el navegador puede sintetizar mouse a partir de un toque real y
 * disparar el mismo gesto dos veces si no se filtra.
 */
const GHOST_CLICK_MS = 800

/** Tope duro de la grabación: al llegar, corta y envía sola. */
const MAX_RECORDING_SECONDS = 300

/**
 * Mixin: ciclo completo del botón de grabación de audio, semántica de WhatsApp.
 *
 * - Toque corto (< HOLD_THRESHOLD_MS) -> alterna: empieza a grabar y se queda grabando, el
 *   próximo toque corta y envía.
 * - Mantener pulsado (>= HOLD_THRESHOLD_MS) -> walkie-talkie: graba mientras el dedo/mouse está
 *   apoyado y corta y envía al soltar.
 * - Mientras graba: cronómetro visible y botón para cancelar sin enviar.
 * - Tope de MAX_RECORDING_SECONDS: corta y envía sola.
 *
 * La grabación arranca SIEMPRE sincrónicamente dentro del touchstart/mousedown, nunca diferida
 * con setTimeout/nextTick/Promise: opus-recorder llama a audioContext.resume() en su start(), y
 * Safari en iOS solo lo permite adentro de un gesto de usuario real. Si se pospone el arranque
 * para "primero decidir si es toque o mantener pulsado", el AudioContext queda suspendido y la
 * nota sale muda. Por eso la decisión toque-vs-mantener se toma recién en el touchend, midiendo
 * cuánto duró el gesto -- nunca antes de empezar a grabar.
 *
 * Contrato con el componente que adopta este mixin:
 * - on_audio_blob(blob) -- OBLIGATORIO. Se llama con el Blob 'audio/ogg' listo para enviar.
 * - can_record_audio() -- opcional. Si el componente lo define y devuelve false, el mixin no
 *   arranca a grabar. Si no lo define, se asume true.
 * - on_audio_error(message) -- opcional. Si no lo define, el mixin hace alert(message).
 */
export default {
  data() {
    return {
      /** true mientras el micrófono está grabando. */
      audio_recording: false,
      /** Instancia OggOpusRecorder activa (null cuando no graba). */
      audio_recorder: null,
      /** Segundos transcurridos de la grabación en curso. */
      audio_elapsed_seconds: 0,
    }
  },

  computed: {
    /**
     * Tiempo transcurrido de la grabación en curso, formato m:ss (ej. "0:07", "1:42").
     *
     * @returns {string}
     */
    audio_elapsed_label() {
      const total = this.audio_elapsed_seconds || 0
      const minutos = Math.floor(total / 60)
      const segundos = total % 60
      return minutos + ':' + (segundos < 10 ? '0' : '') + segundos
    },
  },

  created() {
    /*
      Marcas internas del gesto: no van en data() porque no dibujan nada y no
      necesitan ser reactivas -- meterlas ahi solo agrega ruido al sistema de
      reactividad de Vue por algo que ningun template lee.
    */
    this._audio_touch_started_at = 0
    this._audio_last_touch_at = 0
    this._audio_pending_toggle_stop = false
    this._audio_hold_mode = false
    this._audio_hold_timer_id = null
    this._audio_tick_id = null
  },

  beforeDestroy() {
    /* Vue 2: el hook se llama beforeDestroy (en admin-spa, Vue 3, es beforeUnmount).
       cancel_audio_recording() ya limpia los dos temporizadores (tick y hold)
       vía stop_audio_tick(): ninguna vista que use este mixin puede dejar el
       micrófono abierto al desmontarse. */
    this.cancel_audio_recording()
  },

  methods: {
    /**
     * TouchStart: arranca la grabación siempre, sincrónicamente. Si ya estaba
     * grabando, este toque es el que corta (el corte real se hace en el
     * touchend, no acá, para que el mismo toque no dispare dos veces).
     *
     * @param {TouchEvent} event
     * @returns {void}
     */
    on_audio_touchstart(event) {
      event.preventDefault()
      this._audio_last_touch_at = Date.now()

      if (this.audio_recording) {
        this._audio_pending_toggle_stop = true
        return
      }

      this._audio_touch_started_at = Date.now()
      this._audio_hold_mode = false
      /*
        Arranca SINCRONICAMENTE, adentro del gesto -- no se puede diferir con
        setTimeout/nextTick/Promise/requestAnimationFrame para "esperar a ver
        si es hold". Ver el comentario de cabecera del mixin: en iOS, si el
        arranque de audioContext.resume() queda fuera del gesto de usuario, la
        nota sale muda. La decisión toque-vs-mantener se toma recién en el
        touchend, midiendo cuánto duró.
      */
      this.start_audio_recording()
    },

    /**
     * TouchEnd: decide si el toque fue "empezar a grabar" (se queda grabando)
     * o "mantener pulsado" (corta y envía), o ejecuta el corte pendiente si
     * este toque era el segundo de una alternancia.
     *
     * @param {TouchEvent} event
     * @returns {void}
     */
    on_audio_touchend(event) {
      event.preventDefault()
      this._audio_last_touch_at = Date.now()

      if (this._audio_pending_toggle_stop) {
        this._audio_pending_toggle_stop = false
        this.stop_and_send_audio()
        return
      }

      const duracion = Date.now() - this._audio_touch_started_at
      if (duracion >= HOLD_THRESHOLD_MS) {
        /* Mantuvo pulsado: walkie-talkie, corta y envía al soltar. */
        this.stop_and_send_audio()
      }
      /* Toque corto: no corta. Sigue grabando -- el próximo toque entra por
         la rama de _audio_pending_toggle_stop de arriba. */
    },

    /**
     * TouchCancel: el gesto se interrumpió (llamada entrante, notificación,
     * el dedo se fue del botón). Si está grabando, corta y envía lo que haya
     * -- NO descarta: perder el audio del usuario es peor que mandar uno
     * corto, y la duración mínima del grabador (prompt 01) ya evita el
     * archivo vacío.
     *
     * @param {TouchEvent} event
     * @returns {void}
     */
    /*
      El parametro no se usa y la regla no-unused-vars de este repo lo marca. Se conserva —con
      la regla apagada solo en esta linea— para que el cuerpo del port siga siendo byte por byte
      el de admin-spa: lo que se esta cuidando en esta unidad es justamente que nada del grabador
      cambie de comportamiento sin que nadie lo note.
    */
    // eslint-disable-next-line no-unused-vars
    on_audio_touchcancel(event) {
      this._audio_last_touch_at = Date.now()
      this._audio_pending_toggle_stop = false
      if (this.audio_recording) {
        this.stop_and_send_audio()
      }
    },

    /**
     * MouseDown: arma un temporizador corto para distinguir "mantener
     * pulsado" de "click". Si pasaron menos de GHOST_CLICK_MS desde el último
     * evento táctil, es un mouse sintetizado por un toque real -- se ignora.
     *
     * @returns {void}
     */
    on_audio_mousedown() {
      if (Date.now() - this._audio_last_touch_at < GHOST_CLICK_MS) {
        return
      }
      const self = this
      this._audio_hold_timer_id = setTimeout(function () {
        self._audio_hold_mode = true
        self.start_audio_recording()
      }, HOLD_THRESHOLD_MS)
    },

    /**
     * MouseUp o MouseLeave: si el hold ya arrancó a grabar, corta y envía.
     * Mismo guard de eventos sintetizados que on_audio_mousedown.
     *
     * @returns {void}
     */
    on_audio_mouseup_or_leave() {
      if (Date.now() - this._audio_last_touch_at < GHOST_CLICK_MS) {
        return
      }
      if (this._audio_hold_timer_id) {
        clearTimeout(this._audio_hold_timer_id)
        this._audio_hold_timer_id = null
      }
      if (this._audio_hold_mode && this.audio_recording) {
        this._audio_hold_mode = false
        this.stop_and_send_audio()
      }
    },

    /**
     * Click simple: alterna. Si el hold ya lo manejó (mousedown + mouseup),
     * se ignora. Mismo guard de eventos sintetizados que los otros dos.
     *
     * @returns {void}
     */
    on_audio_click() {
      if (Date.now() - this._audio_last_touch_at < GHOST_CLICK_MS) {
        return
      }
      if (this._audio_hold_mode) {
        this._audio_hold_mode = false
        return
      }
      if (this.audio_recording) {
        this.stop_and_send_audio()
      } else {
        this.start_audio_recording()
      }
    },

    /**
     * Inicia una grabación de audio directamente a Ogg/Opus (vía OggOpusRecorder). No hace nada
     * si ya está grabando o si el componente que adopta el mixin define can_record_audio() y
     * devuelve false.
     *
     * @returns {void}
     */
    start_audio_recording() {
      const self = this
      if (this.audio_recording) {
        return
      }
      if (typeof this.can_record_audio === 'function' && !this.can_record_audio()) {
        return
      }
      if (!OggOpusRecorder.isSupported()) {
        if (typeof this.on_audio_error === 'function') {
          this.on_audio_error('Tu navegador no soporta grabación de audio.')
        } else {
          alert('Tu navegador no soporta grabación de audio.')
        }
        return
      }

      const recorder = new OggOpusRecorder({
        onData: function (blob) {
          self.stop_audio_tick()
          self.audio_recording = false
          self.audio_recorder = null
          self.on_audio_blob(blob)
        },
        onError: function (err) {
          console.error('Error en la grabación de audio', err)
          self.stop_audio_tick()
          self.audio_recording = false
          self.audio_recorder = null
          if (typeof self.on_audio_error === 'function') {
            self.on_audio_error('No se pudo acceder al micrófono. Verificá los permisos del navegador.')
          } else {
            alert('No se pudo acceder al micrófono. Verificá los permisos del navegador.')
          }
        },
      })

      self.audio_recorder = recorder
      self.audio_recording = true
      self.audio_elapsed_seconds = 0
      self._audio_tick_id = setInterval(function () {
        self.audio_elapsed_seconds += 1
        if (self.audio_elapsed_seconds >= MAX_RECORDING_SECONDS) {
          self.stop_and_send_audio()
        }
      }, 1000)

      recorder.start().catch(function () {
        /* el error ya se maneja por onError */
      })
    },

    /**
     * Detiene la grabación activa y la envía. No toca audio_recording acá: el grabador del
     * prompt 01 garantiza que siempre va a llegar onData o onError, y son esos callbacks los que
     * apagan la interfaz. Poner un audio_recording = false optimista acá desincroniza el estado
     * -- el botón mostraría "no grabando" mientras el grabador todavía está cerrando de verdad.
     *
     * @returns {void}
     */
    stop_and_send_audio() {
      if (!this.audio_recording || !this.audio_recorder) {
        return
      }
      this.audio_recorder.stop()
    },

    /**
     * Cancela la grabación activa sin enviar nada -- nunca llama a on_audio_blob. Apaga la
     * interfaz en el acto (a diferencia de stop_and_send_audio, acá no hay nada que esperar).
     *
     * @returns {void}
     */
    cancel_audio_recording() {
      if (this.audio_recorder) {
        this.audio_recorder.cancel()
      }
      this.stop_audio_tick()
      this.audio_recording = false
      this.audio_recorder = null
    },

    /**
     * Limpia el cronómetro (setInterval) y el temporizador del gesto de mouse (setTimeout de
     * mousedown), si están corriendo.
     *
     * @returns {void}
     */
    stop_audio_tick() {
      if (this._audio_tick_id) {
        clearInterval(this._audio_tick_id)
        this._audio_tick_id = null
      }
      if (this._audio_hold_timer_id) {
        clearTimeout(this._audio_hold_timer_id)
        this._audio_hold_timer_id = null
      }
    },
  },
}
