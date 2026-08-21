<template>
	<div
	class="editable-cell"
	:class="{ 'editable-cell--dudoso': dudoso }">

		<b-form-input
		v-if="editando"
		ref="input"
		size="sm"
		class="editable-cell__input"
		:type="tipo_de_input"
		:inputmode="modo_de_teclado"
		:step="paso"
		:placeholder="placeholder"
		v-model="borrador"
		@blur="confirmar"
		@keyup.enter="confirmar"
		@keyup.esc="cancelar"></b-form-input>

		<span
		v-else
		class="editable-cell__texto"
		:class="{ 'editable-cell__texto--vacio': !texto }"
		:title="title_del_span"
		tabindex="0"
		role="button"
		@click="empezar"
		@keyup.enter="empezar"
		@keyup.space.prevent="empezar">
			{{ texto || placeholder }}
		</span>

	</div>
</template>
<script>
/*
 * Celda editable de la tabla de revisión de un escaneo (misión escaneo-factura-compra).
 *
 * 🔴 El input aparece recién al hacer clic, no siempre: una tabla de 60 filas × 7
 * columnas con 420 `b-form-input` montados de entrada tarda segundos en pintar y hace
 * saltar el scroll en el teléfono. En reposo cada celda es un <span>, que es lo que
 * cuesta casi nada dibujar; el input existe únicamente mientras se está editando esa
 * celda, o sea de a uno por vez.
 *
 * El `dudoso` (el campo vino en `campos_dudosos` del resultado de la IA) pinta el
 * fondo y agrega un title, pero NO bloquea nada: es un aviso de "mirá esto", no una
 * validación.
 */
export default {
	props: {
		/* Valor actual. Se usa con v-model desde la tabla. */
		value: {
			type: [String, Number],
			default: null,
		},
		/* 'texto' | 'numero' | 'fecha'. Decide el tipo de input y el teclado del teléfono. */
		tipo: {
			type: String,
			default: 'texto',
		},
		/* True si la IA marcó este campo como leído con dificultad. */
		dudoso: {
			type: Boolean,
			default: false,
		},
		placeholder: {
			type: String,
			default: '—',
		},
	},
	data() {
		return {
			editando: false,
			/* Valor mientras se edita. Recién al confirmar se emite hacia afuera. */
			borrador: '',
		}
	},
	computed: {
		texto() {
			if (this.value === null || typeof this.value === 'undefined' || this.value === '') {
				return ''
			}
			return String(this.value)
		},
		tipo_de_input() {
			if (this.tipo === 'fecha') {
				return 'date'
			}
			if (this.tipo === 'numero') {
				return 'number'
			}
			return 'text'
		},
		/*
		 * En el teléfono, cantidad y costo tienen que abrir el teclado numérico. `type`
		 * number ya lo hace en la mayoría de los navegadores, pero `inputmode` lo hace
		 * en todos y además elige el teclado CON coma decimal.
		 */
		modo_de_teclado() {
			if (this.tipo === 'numero') {
				return 'decimal'
			}
			return null
		},
		paso() {
			if (this.tipo === 'numero') {
				return 'any'
			}
			return null
		},
		title_del_span() {
			if (this.dudoso) {
				return 'La IA no lo leyó con claridad, revisalo'
			}
			return this.texto
		},
	},
	methods: {
		/*
		 * Pasa a modo edición y deja el texto seleccionado, para que escribir encima
		 * reemplace en vez de agregar. Es el gesto que espera cualquiera que edita una
		 * planilla.
		 */
		empezar() {
			this.borrador = this.texto
			this.editando = true

			let self = this

			this.$nextTick(() => {
				let componente = self.$refs.input
				if (!componente) {
					return
				}

				/* b-form-input es un componente: el <input> real es su $el. */
				let el = componente.$el ? componente.$el : componente

				if (el && typeof el.focus === 'function') {
					el.focus()
				}

				/*
				 * En un input de fecha no hay texto que seleccionar: el navegador lo
				 * ignora, pero además seleccionar "todo" en un control de tres cajitas
				 * no significa nada. Se salta.
				 */
				if (self.tipo !== 'fecha' && el && typeof el.select === 'function') {
					el.select()
				}
			})
		},
		/*
		 * Emite el valor nuevo y vuelve a reposo.
		 *
		 * La guarda del principio no es defensiva porque sí: al apretar Esc primero
		 * corre `cancelar` (que apaga `editando`, y con eso desmonta el input) y
		 * enseguida dispara el `blur` del input que se está yendo. Sin la guarda, ese
		 * blur pisaría el descarte con el valor que el usuario acababa de rechazar.
		 */
		confirmar() {
			if (!this.editando) {
				return
			}

			this.editando = false
			this.$emit('input', this.normalizar(this.borrador))
		},
		cancelar() {
			this.editando = false
		},
		/*
		 * Vacío siempre vuelve null (no '' ni 0): null es lo que el backend interpreta
		 * como "el usuario no puso nada acá", y un 0 en un costo es un dato, no un
		 * vacío.
		 *
		 * @param {String} valor
		 * @return {String|Number|null}
		 */
		normalizar(valor) {
			let limpio = typeof valor === 'string' ? valor.trim() : valor

			if (limpio === '' || limpio === null || typeof limpio === 'undefined') {
				return null
			}

			if (this.tipo === 'numero') {
				/* La coma decimal del teclado en español no la entiende parseFloat. */
				let numero = parseFloat(String(limpio).replace(',', '.'))
				return isNaN(numero) ? null : numero
			}

			return limpio
		},
	},
}
</script>
<style lang="sass">
.editable-cell
	width: 100%
	min-width: 0

	&__texto
		display: block
		width: 100%
		min-height: 28px
		padding: 4px 6px
		border: 1px solid transparent
		border-radius: 6px
		font-size: 0.85rem
		line-height: 1.3
		color: #1e293b
		cursor: text
		// El valor de un nombre de artículo es largo: envuelve en vez de desbordar la
		// celda, que a 768px es donde se rompía todo.
		overflow-wrap: anywhere

		&:hover
			border-color: rgba(100, 116, 139, 0.35)
			background: rgba(100, 116, 139, 0.06)

		&:focus
			outline: none
			border-color: #2563eb
			box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15)

		&--vacio
			color: #94a3b8

	&__input
		font-size: 0.85rem

	&--dudoso
		.editable-cell__texto
			background: rgba(245, 158, 11, 0.16)
			border-color: rgba(245, 158, 11, 0.5)

		.editable-cell__input
			border-color: rgba(245, 158, 11, 0.7)

html.dark-mode .editable-cell
	&__texto
		color: var(--color-text-primary)

		&:hover
			background: var(--bg-hover)
			border-color: var(--color-border)

		&--vacio
			color: #94a3b8
</style>
