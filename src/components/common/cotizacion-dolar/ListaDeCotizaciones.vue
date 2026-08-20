<template>
	<div class="cotizacion-dolar-lista">

		<!--
			Las tres casas con sus dos puntas.
			🔴 Sin cotizaciones el bloque entero no se dibuja, y NO se dibuja vacío: una lista
			vacía se leería como "hoy no hay cotizaciones", que es otra cosa que "no pudimos
			consultarlas". El porqué lo dice el cartel que pone el modal arriba de esta lista.
		-->
		<div v-if="cotizaciones.length">
			<div
			v-for="cotizacion in cotizaciones"
			:key="cotizacion.clave"
			class="cotizacion-dolar-lista__casa">

				<div class="cotizacion-dolar-lista__casa-nombre">
					{{ cotizacion.nombre }}
				</div>

				<!--
					Las dos puntas se muestran siempre y por separado, aunque valgan lo mismo.
					El MEP viene con compra igual a venta: colapsarlas, o asumir que compra es
					menor que venta, sería inventar una regla que la fuente no cumple.
				-->
				<div class="cotizacion-dolar-lista__puntas">
					<b-button
					v-for="punta in puntas"
					:key="punta.clave"
					class="cotizacion-dolar-lista__punta"
					:class="{ 'is-activa': esta_elegida(cotizacion.clave, punta.clave) }"
					variant="outline-secondary"
					@click="elegir_preestablecida(cotizacion.clave, punta.clave)">
						<span class="cotizacion-dolar-lista__punta-nombre">
							{{ punta.nombre }}
						</span>
						<span class="cotizacion-dolar-lista__punta-valor">
							{{ price(cotizacion[punta.clave]) }}
						</span>
					</b-button>
				</div>

			</div>
		</div>

		<!--
			El valor a mano. Es el único camino que sigue disponible cuando el proveedor no
			responde, así que nunca se esconde.
		-->
		<div
		class="cotizacion-dolar-lista__manual"
		:class="{ 'is-activa': es_manual }">

			<div class="cotizacion-dolar-lista__titulo">
				Cargar un valor a mano
			</div>

			<b-form-input
			autocomplete="off"
			type="number"
			step="0.01"
			min="0.01"
			placeholder="Ej: 1600"
			v-model="valor_manual"></b-form-input>

			<!--
				Contra qué cotización se mide la variación cuando el valor se carga a mano. Es
				lo único que hace posible el aviso: sin referencia el valor queda quieto para
				siempre y nadie avisa nada.
				Los selects se habilitan recién cuando hay un valor a mano cargado, porque con
				un origen preestablecido la referencia ES el origen y elegir otra distinta
				sería una selección que el backend rechaza.
			-->
			<div class="cotizacion-dolar-lista__referencia">
				<span class="cotizacion-dolar-lista__referencia-label">
					Comparar contra
				</span>
				<b-form-select
				:disabled="!es_manual"
				:options="opciones_de_casa"
				v-model="casa_de_referencia"></b-form-select>
				<b-form-select
				:disabled="!es_manual"
				:options="opciones_de_punta"
				v-model="punta_de_referencia"></b-form-select>
			</div>

		</div>

	</div>
</template>
<script>
/**
 * Las tres casas con sus dos puntas, más el valor a mano con su referencia.
 *
 * Es un componente de `v-model`: recibe la selección armada y emite la nueva completa. No
 * escribe en el store ni llama a la API -- de guardar se encarga el modal, que es el que
 * sabe si el usuario apretó el botón primario o se fue.
 *
 * La selección que viaja tiene esta forma, y las cuatro claves están siempre presentes
 * porque las cuatro son obligatorias en el POST:
 *   { origen, casa, punta, valor_manual }
 */

/**
 * Las tres casas con el nombre que ve el usuario.
 *
 * Se declaran acá y no se derivan de la respuesta porque los selects de referencia tienen
 * que seguir funcionando con el proveedor caído, que es justo cuando `cotizaciones` viene
 * vacío. 🔴 La clave del MEP es 'mep' para nosotros; en la API de origen esa casa se llama
 * 'bolsa' y el backend hace la traducción -- acá nunca aparece ese nombre.
 */
const CASAS = [
	{ clave: 'oficial', nombre: 'Oficial' },
	{ clave: 'blue', nombre: 'Blue' },
	{ clave: 'mep', nombre: 'MEP' },
]

/** Referencia por default del valor a mano, cuando el usuario no eligió ninguna. */
const CASA_POR_DEFAULT = 'blue'
const PUNTA_POR_DEFAULT = 'venta'

export default {
	props: {
		value: {
			type: Object,
			required: true,
		},
	},
	computed: {
		cotizaciones() {
			return this.$store.state.dolar_cotizacion.cotizaciones
		},
		es_manual() {
			return this.value.origen === 'manual'
		},
		puntas() {
			return [
				{ clave: 'compra', nombre: 'Compra' },
				{ clave: 'venta', nombre: 'Venta' },
			]
		},
		opciones_de_casa() {
			return CASAS.map(casa => {
				return { value: casa.clave, text: casa.nombre }
			})
		},
		opciones_de_punta() {
			return [
				{ value: 'compra', text: 'compra' },
				{ value: 'venta', text: 'venta' },
			]
		},
		/**
		 * El valor a mano. Escribir acá es lo que pasa la selección a origen 'manual': no hay
		 * un paso previo de "activar el modo manual" porque tipear ya lo dice todo.
		 */
		valor_manual: {
			get() {
				return this.value.valor_manual
			},
			set(valor) {
				let limpio = valor === '' || valor === null || valor === undefined
					? null
					: Number(valor)
				this.emitir({
					origen: 'manual',
					valor_manual: limpio,
					casa: this.value.casa || CASA_POR_DEFAULT,
					punta: this.value.punta || PUNTA_POR_DEFAULT,
				})
			},
		},
		casa_de_referencia: {
			get() {
				return this.value.casa || CASA_POR_DEFAULT
			},
			set(valor) {
				this.emitir({ casa: valor })
			},
		},
		punta_de_referencia: {
			get() {
				return this.value.punta || PUNTA_POR_DEFAULT
			},
			set(valor) {
				this.emitir({ punta: valor })
			},
		},
	},
	methods: {
		/**
		 * Una punta de una casa preestablecida.
		 *
		 * `casa` queda igual que `origen` porque con un origen preestablecido la referencia
		 * es el propio origen -- el backend rechaza con 422 cualquier otra combinación.
		 * `valor_manual` se limpia: dejarlo cargado haría que el número que el usuario ve en
		 * el input no tenga nada que ver con el que se va a guardar.
		 *
		 * @param {String} clave_casa 'oficial' | 'blue' | 'mep'
		 * @param {String} clave_punta 'compra' | 'venta'
		 * @returns {void}
		 */
		elegir_preestablecida(clave_casa, clave_punta) {
			this.emitir({
				origen: clave_casa,
				casa: clave_casa,
				punta: clave_punta,
				valor_manual: null,
			})
		},
		esta_elegida(clave_casa, clave_punta) {
			return this.value.origen === clave_casa && this.value.punta === clave_punta
		},
		/**
		 * Emite la selección entera, no el pedacito que cambió: el que la recibe nunca tiene
		 * que reconstruirla y no puede quedarse con una mitad vieja.
		 *
		 * @param {Object} cambios claves de la selección que cambian.
		 * @returns {void}
		 */
		emitir(cambios) {
			this.$emit('input', Object.assign({}, this.value, cambios))
		},
	},
}
</script>
<style lang="sass">
.cotizacion-dolar-lista
	&__casa
		display: flex
		align-items: center
		justify-content: space-between
		gap: 12px
		padding: 8px 0
		border-bottom: 1px solid var(--color-border)

	&__casa-nombre
		font-size: 14px
		color: var(--color-text-primary)

	&__puntas
		display: flex
		gap: 8px

	&__punta
		display: flex
		flex-direction: column
		align-items: flex-start
		line-height: 1.2
		padding: 6px 12px
		min-width: 112px

	&__punta-nombre
		font-size: 11px
		color: var(--color-text-secondary)

	&__punta-valor
		font-size: 14px
		font-weight: 600

	&__manual
		margin-top: 14px
		padding: 12px
		border: 1px solid var(--color-border)
		border-radius: 8px

	&__titulo
		font-size: 13px
		color: var(--color-text-secondary)
		margin-bottom: 8px

	&__referencia
		display: flex
		align-items: center
		gap: 8px
		margin-top: 10px

	&__referencia-label
		font-size: 13px
		color: var(--color-text-secondary)
		white-space: nowrap

// El estado elegido se marca con el color primario en el borde y el texto, y no rellenando
// el boton: el unico relleno fuerte del modal es la accion primaria, y dos rellenos fuertes
// a la vez dejan de decir cual es el que importa.
.cotizacion-dolar-lista__punta.is-activa
	border-color: var(--color-primary)
	color: var(--color-primary)
	background-color: var(--bg-hover)

	.cotizacion-dolar-lista__punta-nombre
		color: var(--color-primary)

	&:hover, &:focus, &:active
		border-color: var(--color-primary)
		color: var(--color-primary)
		background-color: var(--bg-hover)

.cotizacion-dolar-lista__manual.is-activa
	border-color: var(--color-primary)

@media (max-width: 576px)
	// En telefono el nombre de la casa va arriba y las dos puntas se reparten el ancho: los
	// dos botones al lado del nombre quedan demasiado angostos para tocarlos sin errarle.
	.cotizacion-dolar-lista__casa
		flex-direction: column
		align-items: stretch
		gap: 6px

	.cotizacion-dolar-lista__puntas
		width: 100%

	.cotizacion-dolar-lista__punta
		flex: 1 1 50%
		min-width: 0

	.cotizacion-dolar-lista__referencia
		flex-wrap: wrap
</style>
