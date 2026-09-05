<template>
	<div
	class="editable-cell"
	:class="{ 'editable-cell--dudoso': dudoso }">

		<!--
			🔴 El campo numérico es type="text" con inputmode="decimal", y NO type="number".
			Alguien va a querer "corregirlo" de vuelta: no lo hagas, esto se rompió una vez y
			costaba plata en silencio.

			En un <input type="number">, cuando el contenido no es un número válido PARA EL
			NAVEGADOR, la propiedad `value` devuelve la cadena vacía. La coma decimal no es
			válida ahí. O sea: el usuario del teléfono —que es el caso principal, porque la
			foto se saca con el teléfono y el teclado que abre `inputmode="decimal"` es el que
			tiene coma— escribía `2450,50`, apretaba Enter, y al v-model le llegaba ''. La
			celda quedaba en "—", el costo viajaba en null, el backend saltea las claves nulas
			y el artículo se cargaba con su costo viejo o sin ninguno. Cero peso a la compra y
			a la deuda del proveedor, sin un solo mensaje.

			Con type="text" la coma llega entera hasta `normalizar_numero()`, que es quien
			decide qué significa. El teclado numérico del teléfono lo sigue abriendo
			`inputmode="decimal"`, que es el atributo que de verdad manda en móviles.
		-->
		<b-form-input
		v-if="editando"
		ref="input"
		size="sm"
		class="editable-cell__input"
		:type="tipo_de_input"
		:inputmode="modo_de_teclado"
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
		/*
		 * 'fecha' es lo único que sigue siendo un input nativo especializado. Todo lo
		 * demás —incluido lo numérico— es texto: ver el comentario rojo del template.
		 */
		tipo_de_input() {
			if (this.tipo === 'fecha') {
				return 'date'
			}
			return 'text'
		},
		/*
		 * En el teléfono, cantidad, costo y descuento tienen que abrir el teclado
		 * numérico. Con type="text" el único que lo consigue es `inputmode`, y encima
		 * elige el teclado CON coma decimal, que es el que corresponde en español.
		 */
		modo_de_teclado() {
			if (this.tipo === 'numero') {
				return 'decimal'
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
				return this.normalizar_numero(limpio)
			}

			return limpio
		},
		/*
		 * Convierte lo que tipeó una persona en un número de JavaScript, aguantando los
		 * formatos que de verdad aparecen: "2450,50", "2.450,50", "2450.50", "$ 2.450,50",
		 * "1.234", "10%".
		 *
		 * 🔴 Por qué no alcanza `parseFloat(x.replace(',', '.'))`, que era lo que había:
		 *  - `replace` con un string reemplaza SOLO la primera aparición, así que
		 *    "37.468,24" quedaba "37.468.24" y parseFloat cortaba en el segundo punto:
		 *    devolvía 37,468 en vez de 37.468,24. Tres órdenes de magnitud de error en un
		 *    costo, y sin ningún aviso.
		 *  - Y el punto como separador de miles nunca se sacaba.
		 *
		 * Los criterios, escritos porque son decisiones y no obviedades:
		 *
		 *  1. Si conviven punto y coma, el que está MÁS A LA DERECHA es el decimal y el
		 *     otro es separador de miles. Cubre "2.450,50" (argentino) y "2,450.50"
		 *     (inglés) sin tener que adivinar el idioma.
		 *  2. Si hay una sola coma, es decimal. Es el teclado en español: acá nadie
		 *     escribe los miles con coma y sin punto. Si hay VARIAS comas, son miles a la
		 *     inglesa ("1,234,567").
		 *  3. 🔴 Punto solo, que es el caso ambiguo: "1.234" puede ser mil doscientos
		 *     treinta y cuatro (formato argentino) o uno coma doscientos treinta y cuatro.
		 *     CRITERIO ELEGIDO: si después del último punto hay EXACTAMENTE 3 dígitos y
		 *     antes hay algo, se lee como separador de miles → 1234. En cualquier otro
		 *     caso el punto es decimal → "2450.50" es 2450,5 y "1.5" es 1,5.
		 *     Se eligió así porque en una factura de proveedor argentina los importes se
		 *     imprimen con dos decimales, no con tres: un "1.234" con tres dígitos atrás
		 *     es miles en el 99% de los casos, y quien quiera decir "uno coma doscientos
		 *     treinta y cuatro" tiene la coma a mano en su propio teclado.
		 *
		 * @param {String|Number} valor
		 * @return {Number|null}
		 */
		normalizar_numero(valor) {
			/* Se sacan símbolo de moneda, %, espacios y cualquier letra: queda dígitos, . , y - */
			let limpio = String(valor).replace(/[^\d.,-]/g, '')

			if (limpio === '' || limpio === '-') {
				return null
			}

			let negativo = limpio.charAt(0) === '-'
			limpio = limpio.replace(/-/g, '')

			let ultima_coma = limpio.lastIndexOf(',')
			let ultimo_punto = limpio.lastIndexOf('.')

			/* Cuál de los dos signos, si alguno, es el separador decimal. */
			let decimal = null

			if (ultima_coma !== -1 && ultimo_punto !== -1) {
				/* Criterio 1: el de más a la derecha. */
				decimal = ultima_coma > ultimo_punto ? ',' : '.'
			} else if (ultima_coma !== -1) {
				/* Criterio 2: una coma sola es decimal; varias son miles. */
				decimal = limpio.split(',').length === 2 ? ',' : null
			} else if (ultimo_punto !== -1) {
				/* Criterio 3: el caso ambiguo. */
				let decimales_tentativos = limpio.length - ultimo_punto - 1
				let hay_algo_antes = ultimo_punto > 0
				decimal = (decimales_tentativos === 3 && hay_algo_antes) ? null : '.'
			}

			if (decimal === null) {
				/* Todo lo que hay son separadores de miles: se borran. */
				limpio = limpio.replace(/[.,]/g, '')
			} else {
				/*
				 * Se corta en el ÚLTIMO separador decimal y se limpia cada mitad. Así
				 * "1.234.567,89" y "1,234,567.89" terminan los dos en "1234567.89", sin
				 * depender de cuántos separadores de miles hubiera.
				 */
				let corte = limpio.lastIndexOf(decimal)
				let enteros = limpio.slice(0, corte).replace(/[.,]/g, '')
				let decimales = limpio.slice(corte + 1).replace(/[.,]/g, '')
				limpio = enteros + '.' + decimales
			}

			let numero = parseFloat(limpio)

			if (isNaN(numero)) {
				return null
			}

			return negativo ? -numero : numero
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
