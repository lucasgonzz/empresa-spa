/* eslint-disable no-console */

import { register } from 'register-service-worker'

/**
 * Clave de `sessionStorage` donde se guarda el momento (epoch en ms) de la última recarga hecha
 * por la red de seguridad de archivos faltantes. Es por pestaña a propósito: la recarga de una
 * pestaña no tiene por qué frenar a otra.
 */
const CLAVE_RECARGA_POR_ARCHIVO_FALTANTE = 'cc_recarga_por_archivo_faltante'

/**
 * Ventana (en ms) durante la cual la red de seguridad NO vuelve a recargar la pestaña. Es el
 * freno anti-bucle: si después de recargar el archivo sigue faltando (el servidor realmente no lo
 * tiene), el segundo error cae dentro de esta ventana y no hace nada.
 */
const VENTANA_RECARGA_MS = 60000

/**
 * Pide permiso para recargar la pestaña y, si lo obtiene, deja anotado el momento.
 *
 * Devuelve `false` (NO recargar) si hubo otra recarga por este motivo hace menos de
 * VENTANA_RECARGA_MS, y también si `sessionStorage` no anda (modo privado estricto, cuota llena,
 * bloqueado): sin poder anotar el momento no hay freno anti-bucle, y una recarga sin freno es peor
 * que dejar una pantalla sin cargar.
 *
 * @returns {boolean} `true` si se puede recargar ahora.
 */
function tomar_turno_de_recarga() {
    try {
        const ahora = Date.now()
        const ultima = parseInt(window.sessionStorage.getItem(CLAVE_RECARGA_POR_ARCHIVO_FALTANTE), 10)

        if (!isNaN(ultima) && ahora - ultima < VENTANA_RECARGA_MS) {
            return false
        }

        window.sessionStorage.setItem(CLAVE_RECARGA_POR_ARCHIVO_FALTANTE, String(ahora))

        // Se relee lo escrito: un almacenamiento que acepta el setItem pero no lo guarda no frena nada.
        return window.sessionStorage.getItem(CLAVE_RECARGA_POR_ARCHIVO_FALTANTE) === String(ahora)
    } catch (e) {
        return false
    }
}

/**
 * Mensajes con los que los navegadores avisan que un `<script>` ejecutó HTML como si fuera
 * JavaScript: Chrome y Safari dicen "Unexpected token '<'" (Safari: "Unrecognized token '<'"),
 * Firefox dice "expected expression, got '<'". Ver el segundo disparador de
 * `instalar_red_de_seguridad_de_archivos_faltantes`.
 */
const PATRON_HTML_EJECUTADO_COMO_JS = /token\s*'?<|got\s*'<'/i

/**
 * Los tres navegadores arman el mensaje del `ErrorEvent` de un error de sintaxis con el nombre
 * del error adelante (Chrome: "Uncaught SyntaxError: Unexpected token '<'"; Safari: "SyntaxError:
 * Unexpected token '<'"; Firefox: "SyntaxError: expected expression, got '<'"). Se exige además de
 * PATRON_HTML_EJECUTADO_COMO_JS porque ese patrón solo habla de un "token <", y un
 * `throw new Error('... token <abc> ...')` de la propia aplicación, lanzado desde un archivo de
 * `js/`, lo cumpliría sin ser un archivo faltante.
 */
const PATRON_ERROR_DE_SINTAXIS = /SyntaxError/i

/**
 * ¿Esta dirección es un archivo de la propia aplicación? O sea: del mismo origen que la página y
 * bajo alguno de los prefijos de ruta indicados (por ejemplo `/js/` o `/css/`).
 *
 * Nunca lanza: una dirección que no se puede interpretar es "no".
 *
 * @param {string} direccion Dirección del archivo (absoluta o relativa a la página).
 * @param {string[]} prefijos Prefijos de ruta que cuentan como "de la app".
 * @returns {boolean} `true` si es de la app.
 */
function es_archivo_de_la_app(direccion, prefijos) {
    try {
        if (!direccion) {
            return false
        }

        const url = new URL(direccion, window.location.href)

        if (url.origin !== window.location.origin) {
            return false
        }

        return prefijos.some(function (prefijo) {
            return url.pathname.indexOf(prefijo) === 0
        })
    } catch (e) {
        return false
    }
}

/**
 * ¿Este `<link>` es una hoja de estilos (`rel="stylesheet"`)? Se compara en minúsculas y por
 * palabra, porque `rel` puede traer varias ("preload stylesheet").
 *
 * Es el único `<link>` que le interesa a la red de seguridad: un `rel="prefetch"`, `preload` o
 * `modulepreload` es solo una pista al navegador, no algo que la pantalla necesite para andar, y
 * si falla (red inestable) recargar la pestaña sería una recarga espontánea sin motivo.
 *
 * @param {HTMLLinkElement} elemento Elemento `<link>` que disparó el `error`.
 * @returns {boolean} `true` si es una hoja de estilos.
 */
function es_link_de_hoja_de_estilos(elemento) {
    try {
        return String(elemento.rel || '').toLowerCase().split(/\s+/).indexOf('stylesheet') !== -1
    } catch (e) {
        return false
    }
}

/**
 * Confirma contra el servidor que un archivo de la aplicación REALMENTE no existe, antes de
 * recargar por él.
 *
 * Por qué hace falta. Un `<script>` o un `<link>` también dispara `error` cuando el archivo SÍ
 * existe pero la conexión se cortó o se reseteó a mitad de la descarga. Recargar por eso, en el
 * ERP, puede perder una venta que estaba a medio cargar, y no arregla nada: fue un corte, no un
 * deploy. Entonces se pregunta con un `HEAD` (sin cuerpo, sin caché, sin credenciales) y solo se
 * dice que falta si el servidor lo confirma:
 *
 * - 404 o 410: el archivo no está (se borró en un deploy).
 * - 200 con `Content-Type` html: el servidor de SPA contestó el `index.html` en lugar del archivo
 *   (el `.htaccess` de este repo y el `try_files` de nginx lo hacen con cualquier ruta que no sea
 *   un archivo).
 *
 * Cualquier otra cosa NO es "falta": que el `fetch` se rechace (la red está caída), un 5xx (el
 * servidor tuvo un problema, el archivo puede estar), o un 200 que no es html (el archivo existe).
 *
 * @param {string} direccion Dirección del archivo que dio `error`.
 * @returns {Promise<boolean>} `true` si el servidor confirma que falta. Nunca rechaza.
 */
function confirmar_que_el_archivo_no_existe(direccion) {
    try {
        return window.fetch(direccion, { method: 'HEAD', cache: 'no-store', credentials: 'omit' })
            .then(function (respuesta) {
                if (respuesta.status === 404 || respuesta.status === 410) {
                    return true
                }

                if (respuesta.ok) {
                    return String(respuesta.headers.get('Content-Type') || '').toLowerCase().indexOf('html') !== -1
                }

                return false
            })
            .catch(function () {
                return false
            })
    } catch (e) {
        return Promise.resolve(false)
    }
}

/**
 * Red de seguridad de archivos faltantes (misión quitar-animacion-de-actualizacion, 16/10/2026).
 *
 * Por qué existe. Antes, cuando el service worker se actualizaba, TODAS las pestañas abiertas se
 * recargaban solas, y eso tapaba un problema de fondo: una pestaña que estuvo abierta durante un
 * deploy tiene el bundle viejo en memoria y, al entrar a una pantalla que se carga a demanda,
 * pide un archivo (`js/chunk-xxxx.<hash>.js`, o su `css/`) que la versión nueva ya no tiene. Sin
 * la recarga forzada, esa pantalla quedaría sin abrir hasta que el usuario apriete F5. Ahora la
 * versión nueva se aplica en la visita siguiente y no hay recarga forzada, así que este listener
 * cubre justo ese caso.
 *
 * Qué hace. Escucha en FASE DE CAPTURA los eventos `error` de `window`, con DOS disparadores:
 *
 * (a) Falló la carga de un `<script>` o de un `<link rel="stylesheet">`: el elemento dispara su
 *     propio `error`, que no burbujea pero la captura sí ve (es la única forma de enterarse sin
 *     tocar a webpack). El `target` es el elemento y se mira su `src` / `href`. Los demás `<link>`
 *     (`prefetch`, `preload`...) se ignoran. Ese `error` NO prueba que el archivo falte (también
 *     salta por un corte de red), así que antes de recargar se lo confirma con un `HEAD`
 *     (ver `confirmar_que_el_archivo_no_existe`).
 *
 * (b) El archivo no existe pero el servidor contesta 200 con el `index.html`. Es lo normal en un
 *     servidor de SPA: el `.htaccess` de este repo (y el `try_files` de nginx, y el `seo.php` de
 *     tienda) devuelve el `index.html` para cualquier ruta que no sea un archivo. Entonces el
 *     `<script>` NO dispara `error` (la descarga salió bien): el navegador ejecuta el HTML como si
 *     fuera JavaScript y salta un `ErrorEvent` de runtime sobre `window` ("SyntaxError: Unexpected
 *     token '<'"), con el `filename` del script que falló. Por eso, si el `target` es `window`, se
 *     recarga SOLO si ese `filename` es un archivo de `js/` de la app Y el mensaje es un
 *     `SyntaxError` de "HTML ejecutado como JavaScript" (PATRON_ERROR_DE_SINTAXIS más
 *     PATRON_HTML_EJECUTADO_COMO_JS). Acá no hace falta el `HEAD`: el mensaje ya prueba que llegó
 *     HTML. Cualquier otro error de runtime NO recarga: un error de código de la aplicación no se
 *     arregla recargando. Tampoco el de un `JSON.parse` sobre un HTML (dice "token <" también,
 *     pero menciona JSON y es un error de la aplicación, no un archivo faltante).
 *
 * Solo le interesan los archivos de la propia aplicación: los que están bajo
 * `process.env.BASE_URL + 'js/'` o `'css/'` en el mismo origen. No mira la API, ni imágenes, ni
 * scripts de terceros (qz-tray, zbar), ni `config.js`.
 *
 * Cuándo recarga. UNA sola vez, y solo si hay red (`navigator.onLine !== false`: sin conexión el
 * archivo falta por eso, y recargar dejaría la pantalla peor) y no hubo otra recarga por este
 * motivo en los últimos VENTANA_RECARGA_MS (ver `tomar_turno_de_recarga`). Esa guarda se consume
 * recién cuando YA se decidió recargar, nunca antes de la verificación. Ante cualquier excepción
 * no hace nada: un freno que se rompe no puede tirar abajo la aplicación.
 *
 * Solo se instala en producción (lo llama el bloque de abajo): en desarrollo un archivo que falta
 * es un error de verdad y recargar solo lo taparía.
 *
 * @returns {void}
 */
function instalar_red_de_seguridad_de_archivos_faltantes() {
    try {
        /** Prefijos (ruta absoluta) de los archivos de la propia aplicación. */
        const prefijo_js = process.env.BASE_URL + 'js/'
        const prefijo_css = process.env.BASE_URL + 'css/'

        /** Evita pedir dos recargas si fallan varios archivos en el mismo instante. */
        let recarga_pedida = false

        /** Direcciones con una verificación en curso, para no preguntarle dos veces lo mismo al servidor. */
        const verificando = {}

        /**
         * Decide recargar: último paso, cuando ya se sabe que el archivo falta de verdad. Acá (y no
         * antes) se consume la guarda de VENTANA_RECARGA_MS.
         *
         * @param {string} archivo Dirección del archivo que falta, para el aviso en consola.
         * @returns {void}
         */
        const recargar_por_archivo_faltante = function (archivo) {
            if (recarga_pedida || navigator.onLine === false || !tomar_turno_de_recarga()) {
                return
            }

            recarga_pedida = true
            console.log('Falta un archivo de la aplicación (' + archivo + '): se recarga para tomar la versión nueva.')
            window.location.reload()
        }

        /**
         * @param {Event|ErrorEvent} evento Evento `error` capturado en `window`.
         * @returns {void}
         */
        const al_fallar_un_archivo = function (evento) {
            try {
                if (recarga_pedida || !evento) {
                    return
                }

                const objetivo = evento.target

                if (objetivo === window) {
                    // Disparador (b): error de runtime. Ver el docblock.
                    const mensaje = String(evento.message || '')

                    if (
                        es_archivo_de_la_app(evento.filename, [prefijo_js])
                        && PATRON_ERROR_DE_SINTAXIS.test(mensaje)
                        && PATRON_HTML_EJECUTADO_COMO_JS.test(mensaje)
                        // Un JSON.parse sobre un HTML dice "token <" igual, pero es un error de la
                        // aplicación (una API que contestó HTML), no un archivo faltante: recargar
                        // no lo arregla. Quien simplifique esta condición vuelve a recargar por
                        // errores ajenos.
                        && !/json/i.test(mensaje)
                    ) {
                        recargar_por_archivo_faltante(String(evento.filename))
                    }

                    return
                }

                if (!objetivo || !objetivo.tagName) {
                    return
                }

                // Disparador (a): falló la carga de un <script> o de una hoja de estilos.
                const etiqueta = String(objetivo.tagName).toUpperCase()
                let direccion = ''

                if (etiqueta === 'SCRIPT') {
                    direccion = objetivo.src
                } else if (etiqueta === 'LINK' && es_link_de_hoja_de_estilos(objetivo)) {
                    direccion = objetivo.href
                }

                if (!es_archivo_de_la_app(direccion, [prefijo_js, prefijo_css])) {
                    return
                }

                // Sin conexión el archivo falta por eso: no hay nada que confirmar ni que recargar.
                if (navigator.onLine === false || verificando[direccion]) {
                    return
                }

                verificando[direccion] = true

                confirmar_que_el_archivo_no_existe(direccion).then(function (falta_de_verdad) {
                    delete verificando[direccion]

                    if (falta_de_verdad) {
                        recargar_por_archivo_faltante(direccion)
                    }
                }).catch(function () {
                    delete verificando[direccion]
                })
            } catch (e) {
                // Sin nada que hacer: la red de seguridad nunca rompe la aplicación.
            }
        }

        window.addEventListener('error', al_fallar_un_archivo, true)
    } catch (e) {
        // Sin nada que hacer: la red de seguridad nunca rompe la aplicación.
    }
}

if (process.env.NODE_ENV === 'production') {
    instalar_red_de_seguridad_de_archivos_faltantes()

    register(`${process.env.BASE_URL}service-worker.js`, {
        ready () {
            console.log('Se cargo desde cache.')
        },
        registered () {
            console.log('Service worker registrado.')
            /**
             * Acá antes se buscaba una versión nueva a los 10 s (y, desde el 24/9/2026, el script
             * de arranque de `public/index.html` lo hacía apenas cargaba el documento). Ya no hace
             * falta: el navegador compara solo el `service-worker.js` en cada navegación a la
             * aplicación, y como el `index.html` ahora se pide a la red, esa comparación ocurre en
             * cada entrada sin que nadie la pida.
             */
        },
        cached () {
            console.log('Se guardo en cache')
        },
        updatefound () {
            console.log('New content is downloading.')
        },
        updated () {
            console.log('Hay una versión nueva: se usa en la próxima visita.')
            /**
             * A propósito NO hace nada más: ni se despacha `swUpdated` (lo escucha el mixin inerte
             * `common-vue/mixins/update_app.js`) ni hay pantalla de "descargando la versión nueva".
             * Misión quitar-animacion-de-actualizacion (16/10/2026). La versión nueva se aplica en
             * la próxima visita: el service worker (`skipWaiting` + `clientsClaim`, ver
             * `vue.config.js`) ya tomó el control de esta pestaña, los archivos guardados se
             * actualizaron en silencio, y la próxima entrada pide el `index.html` a la red y arranca
             * directo en lo último. Si esta pestaña pide un archivo que la versión nueva ya no tiene,
             * lo cubre `instalar_red_de_seguridad_de_archivos_faltantes`. No volver a recargar acá:
             * es exactamente lo que se quitó.
             */
        },
        offline () {
            console.log('No internet connection found. App is running in offline mode.')
        },
        error (error) {
            console.error('Error during service worker registration:', error)
        }
    })
}
