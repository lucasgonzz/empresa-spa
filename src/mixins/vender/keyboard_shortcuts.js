/**
 * Mixin de atajos de teclado globales para el módulo Vender.
 * Centraliza todos los shortcuts F2-F7 en un solo lugar para futura configurabilidad.
 * Se debe agregar a Vender.vue y registrar el listener en mounted / beforeDestroy.
 *
 * Atajos activos:
 *   F2 → Guardar venta (dispara click sobre el botón dusk="btn_vender")
 *   F3 → Expandir Etapa 1 y hacer foco en Método de Pago
 *   F4 → Imprimir (manejado por Print.vue; aquí solo se previene el default del navegador)
 *   F5 → Expandir Etapa 1 y hacer foco en Cliente
 *   F6 → Hacer foco en buscador de artículo por nombre
 *   F7 → Hacer foco en input de código de barras
 */
export default {
    methods: {
        /**
         * Receptor principal del evento keydown global.
         * Previene el comportamiento del navegador para F2-F7 y delega en cada handler.
         *
         * @param {KeyboardEvent} event
         */
        handleVenderKeyboard(event) {
            /* Solo actuar sobre las teclas F2-F7 */
            const handled_keys = ['F2', 'F3', 'F4', 'F5', 'F6', 'F7']
            if (!handled_keys.includes(event.key)) {
                return
            }

            /* Prevenir comportamiento default del navegador (rename archivo, búsqueda, etc.) */
            event.preventDefault()

            if (event.key === 'F2') {
                this._shortcut_guardar_venta()
            } else if (event.key === 'F3') {
                this._shortcut_foco_payment_method()
            } else if (event.key === 'F4') {
                /* F4 (imprimir) lo maneja Print.vue con su propio listener;
                   aquí solo prevenimos el default y pasamos la señal */
                this.$root.$emit('vender:print-shortcut')
            } else if (event.key === 'F5') {
                this._shortcut_foco_client()
            } else if (event.key === 'F6') {
                this._shortcut_foco_article_name()
            } else if (event.key === 'F7') {
                this._shortcut_foco_barcode()
            }
        },

        /**
         * F2 — Guardar venta.
         * Dispara un click programático sobre el botón guardar (dusk="btn_vender")
         * para reutilizar toda la lógica de validación que ya tiene BtnGuardar.vue.
         */
        _shortcut_guardar_venta() {
            const btn = document.querySelector('[dusk="btn_vender"]')
            if (btn && !btn.disabled) {
                btn.click()
            }
        },

        /**
         * F3 — Expandir Etapa 1 y posicionar el foco en el método de pago.
         * VenderStage1 escucha este evento y abre la etapa si estaba colapsada.
         */
        _shortcut_foco_payment_method() {
            this.$root.$emit('vender:expand-stage1', 'payment_method')
        },

        /**
         * F5 — Expandir Etapa 1 y posicionar el foco en el selector de cliente.
         * VenderStage1 escucha este evento y abre la etapa si estaba colapsada.
         */
        _shortcut_foco_client() {
            this.$root.$emit('vender:expand-stage1', 'client')
        },

        /**
         * F6 — Hacer foco en el buscador de artículo por nombre (BuscadorArticulos).
         * Busca el input por id asignado por el componente buscador.
         */
        _shortcut_foco_article_name() {
            /* El input del buscador de artículos tiene este id por convención */
            const input = document.getElementById('search-article')
            if (input) {
                input.focus()
            }
        },

        /**
         * F7 — Hacer foco en el input de código de barras.
         */
        _shortcut_foco_barcode() {
            const input = document.getElementById('article-bar-code')
            if (input) {
                input.focus()
                input.select()
            }
        },
    },
}
