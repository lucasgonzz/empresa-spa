import Vue from 'vue'

/**
 * Recopila mensajes de texto desde el objeto `errors` de una respuesta 422 de Laravel.
 *
 * @param {object} data Cuerpo JSON típico: `{ message, errors }`.
 * @returns {string[]} Lista de mensajes listos para mostrar al usuario.
 */
export function collect_laravel_validation_messages(data) {
  if (!data || !data.errors || typeof data.errors !== 'object' || Array.isArray(data.errors)) {
    return []
  }
  // Acumulador de líneas de error ya traducidas por el servidor
  const messages = []
  Object.keys(data.errors).forEach((field_key) => {
    const entry = data.errors[field_key]
    if (Array.isArray(entry)) {
      entry.forEach((msg) => {
        if (typeof msg === 'string' && msg.length) {
          messages.push(msg)
        }
      })
    } else if (typeof entry === 'string' && entry.length) {
      messages.push(entry)
    }
  })
  return messages
}

/**
 * Indica si la respuesta corresponde a validación de Laravel (422 + mapa `errors`).
 *
 * @param {number} status Código HTTP de la respuesta.
 * @param {*} data Cuerpo parseado de la respuesta.
 * @returns {boolean}
 */
export function is_laravel_validation_payload(status, data) {
  if (status !== 422 || !data || typeof data !== 'object') {
    return false
  }
  const errors = data.errors
  return errors !== null && typeof errors === 'object' && !Array.isArray(errors)
}

/**
 * Muestra un toast con título y lista numerada de errores (texto plano, sin HTML).
 *
 * @param {object} data Cuerpo JSON de Laravel con `message` y `errors`.
 * @param {object} [options] Opciones de vue-toast-notification (p. ej. `duration`).
 * @returns {boolean} true si se mostró el toast.
 */
export function show_laravel_validation_toast(data, options = {}) {
  const messages = collect_laravel_validation_messages(data)
  if (!messages.length) {
    return false
  }
  // Título visible: mensaje general del backend o texto fijo en español
  const default_title = 'Revisa los datos enviados'
  let title = default_title
  if (typeof data.message === 'string' && data.message.trim().length) {
    title = data.message.trim()
  }
  const body = messages.map((msg, idx) => `${idx + 1}. ${msg}`).join('\n')
  const full_message = `${title}\n\n${body}`
  const toast = Vue.prototype.$toast
  if (toast && typeof toast.error === 'function') {
    const merged_options = Object.assign(
      {
        duration: 14000,
      },
      options
    )
    toast.error(full_message, merged_options)
    return true
  }
  return false
}
