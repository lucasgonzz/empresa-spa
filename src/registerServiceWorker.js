/* eslint-disable no-console */

import { register } from 'register-service-worker'

if (process.env.NODE_ENV === 'production') {
    register(`${process.env.BASE_URL}service-worker.js`, {
        ready () {
            console.log('Se cargo desde cache.')
        },
        registered (registration) {
            console.log('Service worker registrado.')
            /**
             * La búsqueda de una versión nueva a los 10 s solo queda de respaldo. Desde el
             * 24/9/2026 el script de arranque de `public/index.html` (`window.__CC_ARRANQUE__`) la
             * hace apenas carga el documento, así que repetirla acá sería un segundo pedido del
             * service worker en cada carga de cada usuario, sin nada nuevo que encontrar.
             */
            if (window.__CC_ARRANQUE__) {
                return
            }
            setTimeout(() => {
                console.log('Buscando actualizacion')
                registration.update()
            }, 1000 * 10)
            // }, 1000 * 60 * 60)
        },
        cached () {
            console.log('Se guardo en cache')
        },
        updatefound () {
            console.log('New content is downloading.')
        },
        updated (registration) {
            console.log('New content is available; please refresh.')
            /**
             * La pantalla de actualización la maneja el script de arranque de `public/index.html`
             * (`window.__CC_ARRANQUE__`), el mismo que la muestra al entrar: una sola animación,
             * de ~3 s, y no las dos versiones que había (esta y la de `LogoLoading`).
             *
             * Es idempotente: si el chequeo de arranque ya estaba actualizando, no hace nada.
             */
            var arranque = window.__CC_ARRANQUE__
            if (arranque && typeof arranque.actualizar_ahora === 'function') {
                arranque.actualizar_ahora(registration)
                return
            }
            /**
             * Respaldo, solo si el script de arranque no existe (un index.html que no lo trae):
             * el evento de siempre, que escucha el mixin `common-vue/mixins/update_app.js`.
             * Con el script de arranque presente ese mixin queda inerte, porque este evento
             * ya no se dispara.
             */
            document.dispatchEvent(
                new CustomEvent('swUpdated', { detail: registration })
            )
            console.log('Se lanzo evento')
        },
        offline () {
            console.log('No internet connection found. App is running in offline mode.')
        },
        error (error) {
            console.error('Error during service worker registration:', error)
        }
    })
}
