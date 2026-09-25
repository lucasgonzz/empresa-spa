<template>
	<!--
		Una fila de resultado del modal de vincular: un cliente del sistema que puede ser el que
		corresponde al comprador de la tienda.

		Es un <label> con un radio NATIVO adentro, escondido a la vista pero no al teclado. Con eso el
		grupo se maneja solo como cualquier grupo de radios (Tab entra al grupo, las flechas eligen,
		el lector de pantalla lo anuncia como "n de m"), y el círculo y el resaltado de la fila los
		dibuja el CSS a partir del estado. Hacerlo con <div role="radio"> obligaría a reescribir el
		manejo de foco y de flechas a mano.
	-->
	<label
	class="vincular-fila"
	:class="{ 'vincular-fila--elegida': elegida }"
	:data-testid="'vincular-comprador-fila-' + cliente.id">
		<input
		type="radio"
		class="vincular-fila__radio"
		:name="grupo"
		:value="cliente.id"
		:checked="elegida"
		@change="$emit('elegir', cliente)">

		<span
		class="vincular-fila__marca"
		aria-hidden="true"></span>

		<span class="vincular-fila__cuerpo">
			<span class="vincular-fila__titulo">
				<span
				class="vincular-fila__nombre"
				:title="nombre">
					{{ nombre }}
				</span>
				<span
				v-if="cliente.num"
				class="vincular-fila__num">
					N° {{ cliente.num }}
				</span>
			</span>

			<!-- El título trae el detalle completo: la línea se corta con puntos y así se puede leer entera. -->
			<span
			v-if="detalle"
			class="vincular-fila__detalle"
			:title="detalle">
				{{ detalle }}
			</span>

			<span
			v-if="pistas.length"
			class="vincular-fila__pistas">
				<span
				v-for="pista in pistas"
				:key="pista.clave"
				class="vincular-pista"
				:class="'vincular-pista--' + pista.tono">
					{{ pista.texto }}
				</span>
			</span>
		</span>
	</label>
</template>
<script>
/**
 * Pistas que se muestran por cada "motivo" que devuelve la API, en orden de fuerza. `fuerte` se
 * pinta con la tinta azul, `suave` es neutra; el aviso de "ya tiene usuario en la tienda" (que no
 * es un motivo de coincidencia sino una advertencia) se agrega aparte, en ámbar.
 *
 * El orden de este arreglo es el de la pantalla: lo más convincente primero.
 */
const MOTIVOS = [
	{ clave: 'email_igual', texto: 'Mismo email', tono: 'fuerte' },
	{ clave: 'nombre_igual', texto: 'Mismo nombre', tono: 'fuerte' },
	{ clave: 'telefono_igual', texto: 'Mismo teléfono', tono: 'fuerte' },
	{ clave: 'nombre_parecido', texto: 'Nombre parecido', tono: 'suave' },
]

/**
 * Una coincidencia del modal de vincular (misión vincular-comprador-desde-pedidos, 24/9/2026).
 *
 * Solo dibuja: no sabe de la API ni del store. Avisa `elegir` con el cliente cuando el usuario lo
 * marca, y el orquestador (./Index.vue) es el que guarda la elección y la vuelve a bajar por
 * `elegida`.
 */
export default {
	props: {
		/**
		 * Cliente del sistema tal como lo devuelve `GET buyer/{id}/clientes-para-vincular`:
		 * `id`, `num`, `name`, `razon_social`, `email`, `phone`, `address`, `cuit`, `dni`,
		 * `motivos` (arreglo de claves) y `tiene_usuario_en_tienda`.
		 */
		cliente: {
			type: Object,
			required: true,
		},
		/** true si esta es la fila elegida. */
		elegida: {
			type: Boolean,
			default: false,
		},
		/** `name` del grupo de radios: tiene que ser el mismo para todas las filas de la lista. */
		grupo: {
			type: String,
			default: 'vincular-comprador-cliente',
		},
	},
	computed: {
		/**
		 * Nombre a mostrar: el del cliente y, si no tiene, su razón social.
		 *
		 * @returns {String}
		 */
		nombre() {
			return this.cliente.name || this.cliente.razon_social || 'Sin nombre'
		},
		/**
		 * Segunda línea: lo que ayuda a reconocer al cliente, con lo que exista y separado por
		 * puntos medios. La razón social va primero, y solo si difiere del nombre: en una búsqueda
		 * también se encuentra por ella, y sin mostrarla un resultado cuyo nombre no se parece a lo
		 * escrito se ve como un error.
		 *
		 * @returns {String}
		 */
		detalle() {
			let partes = []
			let razon_social = this.texto(this.cliente.razon_social)

			if (razon_social !== '' && razon_social !== this.texto(this.cliente.name)) {
				partes.push(razon_social)
			}
			partes.push(this.texto(this.cliente.phone))
			partes.push(this.texto(this.cliente.email))

			if (this.texto(this.cliente.cuit) !== '') {
				partes.push('CUIT ' + this.texto(this.cliente.cuit))
			} else if (this.texto(this.cliente.dni) !== '') {
				partes.push('DNI ' + this.texto(this.cliente.dni))
			}
			partes.push(this.texto(this.cliente.address))

			return partes.filter(function (parte) {
				return parte !== ''
			}).join(' · ')
		},
		/**
		 * Pistas de la fila: los motivos por los que la API propone a este cliente, en orden de
		 * fuerza, y al final el aviso de que otro comprador de la tienda ya está vinculado a él.
		 *
		 * @returns {Array<{clave: String, texto: String, tono: String}>}
		 */
		pistas() {
			let pistas = []
			let motivos = Array.isArray(this.cliente.motivos) ? this.cliente.motivos : []

			MOTIVOS.forEach(function (motivo) {
				if (motivos.indexOf(motivo.clave) !== -1) {
					pistas.push(motivo)
				}
			})

			if (this.cliente.tiene_usuario_en_tienda) {
				pistas.push({
					clave: 'tiene_usuario_en_tienda',
					texto: 'Ya tiene usuario en la tienda',
					tono: 'atencion',
				})
			}

			return pistas
		},
	},
	methods: {
		/**
		 * Valor como texto sin espacios de borde ('' para null/undefined).
		 *
		 * @param {*} valor
		 * @returns {String}
		 */
		texto(valor) {
			return valor === null || typeof valor === 'undefined' ? '' : String(valor).trim()
		},
	},
}
</script>
<style lang="sass">
@import '@/components/online/components/vincular-comprador/_tokens'

// Fila de coincidencia. Sin `scoped`, con el prefijo `vincular-fila` propio: los b-modal cuelgan de
// <body> y estos estilos tienen que llegar igual, y los tokens de _tokens.sass son globales.
//
// Todo el color sale de tokens (tema claro/oscuro), nada de hexadecimales.
.vincular-fila
	position: relative
	display: flex
	align-items: flex-start
	// La fila no se achica: la lista que la contiene es una columna flex con alto máximo, y sin esto
	// una lista larga aplastaría las filas en vez de scrollear.
	flex: 0 0 auto
	gap: 12px
	width: 100%
	// bootstrap le pone `margin-bottom: .5rem` y `display: inline-block` a todo <label>.
	margin: 0
	padding: 10px 12px
	border: 1px solid var(--color-border)
	border-radius: 10px
	background: var(--bg-card)
	color: var(--color-text-primary)
	// El contenedor de la app centra el texto (`#app { text-align: center }`), y aunque el modal
	// cuelga de <body>, esta fila también se puede montar adentro de #app: se declara acá y no se
	// depende de dónde caiga.
	text-align: left
	font-weight: 400
	cursor: pointer
	transition: background-color 0.15s ease, border-color 0.15s ease

	&:hover
		background: var(--bg-hover)

	// La fila elegida: borde de acento y una tinta apenas por encima de la tarjeta. Va después del
	// :hover a propósito, para que la tinta no se pierda al pasar el mouse por la elegida.
	&--elegida,
	&--elegida:hover
		border-color: var(--color-primary)
		background: var(--vincular-elegida-fondo)

// El radio nativo: fuera de la vista pero DENTRO del árbol de foco (nada de display: none ni
// visibility: hidden, que lo sacarían del teclado). El foco se dibuja sobre el círculo de abajo.
.vincular-fila__radio
	position: absolute
	width: 1px
	height: 1px
	margin: 0
	opacity: 0
	pointer-events: none

// El círculo. Borde en --color-text-secondary y no en --color-border: el gris de borde es tan
// suave que un círculo sin elegir casi no se vería, y un control necesita contraste propio.
.vincular-fila__marca
	position: relative
	flex: 0 0 auto
	width: 18px
	height: 18px
	margin-top: 2px
	border: 2px solid var(--color-text-secondary)
	border-radius: 50%
	background: var(--bg-card)
	transition: border-color 0.15s ease

	// El punto de adentro: crece desde el centro al elegir.
	&::after
		content: ''
		position: absolute
		top: 50%
		left: 50%
		width: 8px
		height: 8px
		margin: -4px 0 0 -4px
		border-radius: 50%
		background: var(--color-primary)
		transform: scale(0)
		transition: transform 0.15s ease

.vincular-fila--elegida .vincular-fila__marca
	border-color: var(--color-primary)

	&::after
		transform: scale(1)

// Anillo de foco de teclado, mismo idioma que el resto de los modales (--metodo-pago-focus-ring).
.vincular-fila__radio:focus-visible ~ .vincular-fila__marca
	border-color: var(--color-primary)
	box-shadow: 0 0 0 3px var(--metodo-pago-focus-ring)

.vincular-fila__cuerpo
	display: flex
	flex-direction: column
	flex: 1 1 auto
	gap: 2px
	// Sin esto el texto largo estira la fila más allá del modal en vez de cortarse con puntos.
	min-width: 0

.vincular-fila__titulo
	display: flex
	align-items: baseline
	gap: 8px
	min-width: 0

.vincular-fila__nombre
	min-width: 0
	overflow: hidden
	text-overflow: ellipsis
	white-space: nowrap
	font-size: 0.9375rem
	font-weight: 600
	line-height: 1.3

.vincular-fila__num
	flex: 0 0 auto
	font-size: 0.75rem
	color: var(--color-text-secondary)

.vincular-fila__detalle
	overflow: hidden
	text-overflow: ellipsis
	white-space: nowrap
	font-size: 0.8125rem
	line-height: 1.35
	color: var(--color-text-secondary)

.vincular-fila__pistas
	display: flex
	flex-wrap: wrap
	gap: 4px
	margin-top: 4px

// Las pistas: píldoras chicas, sin ícono. Tres tonos: `fuerte` (azul de acción, son las que
// convencen), `suave` (neutra, "Nombre parecido") y `atencion` (ámbar, es una advertencia y no una
// coincidencia).
.vincular-pista
	display: inline-flex
	align-items: center
	height: 20px
	padding: 0 8px
	border: 1px solid transparent
	border-radius: 999px
	font-size: 0.6875rem
	font-weight: 600
	line-height: 1
	white-space: nowrap

	&--fuerte
		background: var(--vincular-pista-fondo)
		color: var(--vincular-pista-texto)

	// Sin relleno y con borde: un relleno gris se confundiría con el fondo de la fila en hover.
	&--suave
		border-color: var(--color-border)
		color: var(--color-text-secondary)

	&--atencion
		border-color: var(--vincular-pendiente-borde)
		background: var(--vincular-pendiente-fondo)
		color: var(--vincular-pendiente-texto)
</style>
