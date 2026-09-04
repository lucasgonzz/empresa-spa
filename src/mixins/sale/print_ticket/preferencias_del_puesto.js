import Vue from 'vue'

/**
 * Preferencias de impresion de ESTE puesto (esta computadora), reactivas y compartidas
 * por toda la aplicacion.
 *
 * 🔴 Por que no se leen las cookies directo adentro de un computed: `$cookies.get()` no es
 * reactivo. Un computed que retorna por esa rama termina de evaluarse SIN haber tocado
 * ninguna dependencia reactiva, y Vue entonces no lo recalcula nunca mas -- se lo queda
 * cacheado de por vida. El sintoma era que despues de elegir una impresora nueva se seguia
 * imprimiendo en la vieja, y al reabrir la configuracion aparecia preseleccionada la vieja,
 * como si el guardado no hubiera tomado. Solo se arreglaba con F5.
 *
 * `Vue.observable` resuelve las dos mitades del problema: vuelve reactivo el valor, y al
 * vivir en el modulo (no en una instancia de componente) lo comparten todas las pantallas
 * que imprimen -- el dropdown de la venta y el boton de la factura ARCA leen lo mismo.
 */
export const preferencias_del_puesto = Vue.observable({
    /**
     * Nombre de la impresora elegida en este puesto. Null si nunca se eligio una.
     */
    impresora: null,

    /**
     * Ancho del papel en milimetros. Null si nunca se configuro.
     */
    ancho_mm: null,

    /**
     * Si ya se leyeron las cookies. Evita repetir la lectura en cada componente.
     */
    hidratadas: false,
})

/**
 * Ancho de ticket valido en milimetros, o null.
 *
 * @param {*} valor_crudo cookie, perfil del owner o input del formulario.
 * @returns {number|null}
 */
export function parse_ancho_de_ticket_mm(valor_crudo) {
    if (valor_crudo == null || valor_crudo === '') {
        return null
    }

    let ancho_mm = Number(valor_crudo)

    if (isNaN(ancho_mm) || ancho_mm <= 0) {
        return null
    }

    return ancho_mm
}

/**
 * Carga las preferencias desde las cookies del navegador. Idempotente: la primera pantalla
 * que imprima la llama y las demas no repiten la lectura.
 *
 * @param {Object} cookies instancia de $cookies del componente.
 */
export function hidratar_preferencias_del_puesto(cookies) {
    if (preferencias_del_puesto.hidratadas) {
        return
    }

    preferencias_del_puesto.impresora = cookies.get('impresora') || null
    preferencias_del_puesto.ancho_mm = parse_ancho_de_ticket_mm(cookies.get('ancho_impresora'))
    preferencias_del_puesto.hidratadas = true
}

/**
 * Guarda la eleccion del puesto: primero las cookies (que es lo que sobrevive al F5) y
 * despues el estado reactivo, que es lo que hace que la proxima impresion ya salga con los
 * valores nuevos sin recargar.
 *
 * @param {Object} cookies instancia de $cookies del componente.
 * @param {string} impresora
 * @param {number} ancho_mm
 */
export function guardar_preferencias_del_puesto(cookies, impresora, ancho_mm) {
    // -1 en vue-cookies es "no expira nunca", igual que como se guardaba el ancho antes.
    cookies.set('impresora', impresora, -1)
    cookies.set('ancho_impresora', String(ancho_mm), -1)

    preferencias_del_puesto.impresora = impresora
    preferencias_del_puesto.ancho_mm = ancho_mm
    preferencias_del_puesto.hidratadas = true
}
