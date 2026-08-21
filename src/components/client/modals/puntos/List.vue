<template>
<div class="puntos-list">

	<div v-if="loading">
		<b-skeleton-table
		:rows="6"
		:columns="5"></b-skeleton-table>
	</div>

	<template v-else>

		<!--
			🔴 El wrapper propio existe para poder llegar con `::v-deep` a la <table> que dibuja
			b-table: un estilo con `scoped` no cruza a los elementos internos de un componente
			hijo, y el min-width que hace que la tabla scrollee en teléfono en vez de espicharse
			vive justamente ahí adentro.
		-->
		<div class="puntos-list__tabla-wrapper">
			<b-table
			class="m-0"
			head-variant="dark"
			responsive
			show-empty
			empty-text="Este cliente todavía no tiene movimientos de puntos"
			:items="movimientos"
			:fields="campos"
			:tbody-tr-class="clase_de_fila">

				<template #cell(created_at)="fila">
					{{ date(fila.item.created_at) }}
				</template>

				<template #cell(tipo)="fila">
					<b-badge :variant="variante_del_tipo(fila.item.tipo)">
						{{ etiqueta_del_tipo(fila.item.tipo) }}
					</b-badge>
					<!--
						Un lote revertido (venta anulada o nota de crédito total) sigue en el
						libro: se marca, no se esconde. Esconderlo dejaría un saldo que no se
						puede explicar sumando las filas que se ven.
					-->
					<b-badge
					v-if="fila.item.anulado_at"
					class="m-l-5"
					variant="secondary">
						Revertido
					</b-badge>
				</template>

				<template #cell(detalle)="fila">
					<span>{{ fila.item.detalle }}</span>
					<b-button
					v-if="fila.item.sale_id"
					class="m-l-5"
					size="sm"
					variant="link"
					@click="ver_venta(fila.item)">
						Ver venta
					</b-button>
				</template>

				<template #cell(lista)="fila">
					{{ nombre_de_la_lista(fila.item) }}
				</template>

				<template #cell(monto_base)="fila">
					<span v-if="fila.item.monto_base !== null && typeof fila.item.monto_base != 'undefined'">
						{{ price(fila.item.monto_base) }}
					</span>
					<span v-else>-</span>
				</template>

				<template #cell(vence_at)="fila">
					{{ fila.item.vence_at ? date(fila.item.vence_at) : '-' }}
				</template>

				<template #cell(puntos)="fila">
					<span
					class="puntos-list__puntos"
					:class="fila.item.puntos < 0 ? 'puntos-list__puntos--resta' : 'puntos-list__puntos--suma'">
						{{ puntos_con_signo(fila.item.puntos) }}
					</span>
				</template>

			</b-table>
		</div>

		<div
		v-if="hay_paginas"
		class="puntos-list__paginacion">
			<b-pagination
			class="m-0"
			pills
			v-model="pagina_actual"
			:total-rows="paginacion.total_registros"
			:per-page="paginacion.per_page"></b-pagination>
		</div>

	</template>

</div>
</template>
<script>
/**
 * El libro de movimientos de puntos de un cliente, paginado.
 *
 * Es la mitad de abajo del modal, el equivalente de `common/current-acounts/List.vue` en la
 * cuenta corriente: arriba el saldo, abajo por qué es ese saldo.
 *
 * 🔴 NO HAY COLUMNA DE "SALDO CORRIDO", aunque la sección 9.3 del plan la nombre.
 * El libro viene ordenado `created_at DESC, id DESC` y PAGINADO de a 25: el saldo corrido de la
 * primera fila de la página 2 depende de todo lo que hay debajo, que en esa página no está. Se
 * podría pedir el libro entero para calcularlo en el navegador, pero el endpoint tiene tope de
 * 500 registros a propósito y un cliente viejo los pasa. Una columna que da bien en la página 1
 * y mal en la 2 es peor que no tenerla: el saldo real está arriba, en la franja, y lo dice la
 * API. Si alguna vez se quiere de verdad, lo calcula el backend en la misma query.
 *
 * 🔴 EL SIGNO DE `puntos` VIENE DE LA API Y NO SE DEDUCE DEL `tipo`.
 * La columna es signada (`+` suma, `-` resta) y el saldo es `SUM(puntos)`. Pintar de rojo por
 * `tipo == 'canjeados'` sería el mismo dato decidido con dos criterios, y el `ajuste` —que puede
 * ser de los dos signos— rompería la regla el primer día.
 */
export default {
	computed: {
		movimientos() {
			return this.$store.state.puntos.movimientos
		},
		loading() {
			return this.$store.state.puntos.movimientos_loading
		},
		paginacion() {
			return this.$store.state.puntos.movimientos_paginacion
		},
		hay_paginas() {
			return this.paginacion.total_registros > this.paginacion.per_page
		},
		campos() {
			return [
				{key: 'created_at', label: 'Fecha'},
				{key: 'tipo', label: 'Tipo'},
				{key: 'detalle', label: 'Detalle'},
				{key: 'lista', label: 'Lista de precio'},
				{key: 'monto_base', label: 'Monto base'},
				{key: 'vence_at', label: 'Vence'},
				{key: 'puntos', label: 'Puntos', class: 'text-right'},
			]
		},
		pagina_actual: {
			get() {
				return this.paginacion.page
			},
			set(value) {
				if (value != this.paginacion.page) {
					// El pedido lo hace el modal y no este componente: es el mismo camino con el
					// que se abre la pantalla, así que no hay dos formas de cargar lo mismo.
					this.$emit('pagina', value)
				}
			},
		},
	},
	methods: {
		/**
		 * Puntos con el signo adelante y sin los dos decimales de la columna `decimal(20,2)`.
		 *
		 * @param {*} valor
		 * @returns {String}
		 */
		puntos_con_signo(valor) {
			let numero = Number(valor) || 0
			let texto = this.numero_es(Math.abs(numero))
			if (numero < 0) {
				return '- ' + texto
			}
			return '+ ' + texto
		},
		etiqueta_del_tipo(tipo) {
			let etiquetas = {
				ganados: 'Ganados',
				canjeados: 'Canjeados',
				vencidos: 'Vencidos',
				revertidos: 'Revertidos',
				ajuste: 'Ajuste',
			}
			// Un tipo que no conocemos se muestra crudo antes que dejar la celda en blanco.
			return etiquetas[tipo] ? etiquetas[tipo] : tipo
		},
		variante_del_tipo(tipo) {
			let variantes = {
				ganados: 'success',
				canjeados: 'primary',
				vencidos: 'secondary',
				revertidos: 'warning',
				ajuste: 'info',
			}
			return variantes[tipo] ? variantes[tipo] : 'light'
		},
		/**
		 * Con qué lista de precio se otorgó el movimiento.
		 *
		 * `price_type_id` en 0 es el centinela "sin lista": la columna es NOT NULL con default 0
		 * porque MySQL deja pasar N filas con NULL en un unique, y el libro tiene uno. O sea que
		 * 0 no es un id: es la ausencia de lista, y se muestra como tal.
		 *
		 * @param {Object} movimiento
		 * @returns {String}
		 */
		nombre_de_la_lista(movimiento) {
			if (movimiento.price_type && movimiento.price_type.name) {
				return movimiento.price_type.name
			}
			return 'Sin lista'
		},
		/**
		 * Clase de la fila. Un lote revertido se tiene que ver distinto del resto.
		 *
		 * @param {Object} item
		 * @returns {String|null}
		 */
		clase_de_fila(item) {
			if (item && item.anulado_at) {
				return 'puntos-list__fila--anulada'
			}
			return null
		},
		/**
		 * Abre la venta que originó el movimiento.
		 *
		 * `show_model` es el mecanismo genérico del sistema y necesita que el modal del modelo
		 * esté montado. `<sale-modal>` lo monta `common/current-acounts/Index.vue`, que
		 * `views/Client.vue` ya tiene arriba de todo: por eso desde esta vista el link funciona
		 * sin montar un modal propio.
		 *
		 * @param {Object} movimiento
		 */
		ver_venta(movimiento) {
			if (!movimiento.sale_id) {
				return
			}
			this.show_model('sale', movimiento.sale_id)
		},
	},
}
</script>
<style lang="sass" scoped>
.puntos-list
	// El verde de "suma" copia el VALOR de --caja-abierta-texto (grupo 371), que es el único
	// verde del sistema con contraparte en modo oscuro. Se copia y no se usa el token directo
	// porque aquel habla de Cajas: si mañana ese módulo cambia su verde, esta pantalla no tiene
	// por qué cambiar con él. El rojo sí sale del token genérico, que ya tiene nombre de sistema.
	--puntos-suma: #1e6047
	--puntos-resta: var(--btn-peligro-texto)

	padding: 16px 20px 20px 20px

	html.dark-mode &
		--puntos-suma: #86d3b0

	&__tabla-wrapper
		// El radio va en un wrapper EXTERNO y no sobre el elemento que scrollea: por spec el
		// border-radius no recorta las barras de scroll del propio elemento, y con el radio
		// puesto sobre el contenedor con overflow la barra horizontal aparece cortando la curva.
		// Es el mismo criterio del modal de cuenta corriente.
		border: 1px solid var(--color-border)
		border-radius: 10px
		overflow: hidden

		::v-deep table
			// Con `responsive` puesto, el min-width hace que en tablet y teléfono la tabla
			// scrollee horizontal en vez de espicharse hasta que el detalle quede en una letra
			// por línea. Es la solución que ya usan las otras tablas del sistema
			// (`actividad-cliente/Modal.vue`, entre otras).
			min-width: 720px
			margin-bottom: 0

		// Un lote revertido se lee como lo que es: sigue estando, pero ya no cuenta. El tachado
		// va SOLO sobre los puntos y no sobre la fila entera: tachar el detalle y la fecha hace
		// ilegible justamente lo que hay que leer para entender por qué se revirtió.
		::v-deep tr.puntos-list__fila--anulada td
			opacity: 0.65

		::v-deep tr.puntos-list__fila--anulada .puntos-list__puntos
			text-decoration: line-through

	&__puntos
		font-weight: 600
		white-space: nowrap

		&--suma
			color: var(--puntos-suma)

		&--resta
			color: var(--puntos-resta)

	&__paginacion
		display: flex
		justify-content: flex-end
		margin-top: 12px
</style>
