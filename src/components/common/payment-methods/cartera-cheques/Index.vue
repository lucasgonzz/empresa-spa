<template>
	<b-modal
	:id="id"
	size="lg"
	title="Tu cartera de cheques"
	hide-footer
	@show="al_abrir">

		<div class="cartera-cheques__filtros">
			<!--
				horizontal-nav compartido (common-vue) en modo autónomo, el mismo control que ya
				documenta contexto/estilo_interfaz_empresa.md §5 y usa components/agenda/Index.vue.
				El buscador va en su slot #btn_create -mismo patrón que common-vue/views/Abm.vue,
				que combina nav + buscador en la fila- para que quede a la derecha, en la misma
				fila, sin competir con el flex propio del nav.
			-->
			<horizontal-nav
			class="cartera-cheques__nav"
			:items="bancos_nav_items"
			:selected_item_value="banco_seleccionado"
			:show_display="false"
			emitir_setSelected_al_inicio
			@setSelected="al_elegir_banco">
				<template #btn_create>
					<div class="cartera-cheques__buscador">
						<i class="bi bi-search cartera-cheques__buscador-lupa" aria-hidden="true"></i>
						<input
						class="cartera-cheques__buscador-input"
						type="text"
						autocomplete="off"
						v-model="busqueda"
						placeholder="Buscar por cliente, banco o número..."
						data-testid="cartera-cheques-buscador">
					</div>
				</template>
			</horizontal-nav>
		</div>

		<div
		v-if="cheques_filtrados.length"
		class="cartera-cheques__grid">
			<tarjeta-cheque
			v-for="cheque in cheques_filtrados"
			:key="cheque.id"
			:cheque="cheque"
			@elegir="elegir(cheque)"></tarjeta-cheque>
		</div>
		<p
		v-else
		class="cartera-cheques__vacio">
			No hay cheques en tu cartera con ese criterio.
		</p>
	</b-modal>
</template>
<script>
/**
 * Modal de la cartera de cheques disponibles para endosar (misión cartera-cheques-modal,
 * 22/9/2026): reemplaza al <select> que tenía CheckInfo.vue por una interfaz para elegir el
 * cheque a partir de tarjetas con diseño visual de cheque, filtrables por banco (horizontal-nav)
 * y por texto libre (cliente, banco o número).
 *
 * No pide nada a la API: recibe por prop el mismo array `cheques_disponibles` que
 * PaymentMethodsStep.vue ya pide una vez por apertura del modal de pago y reparte por fila, ya
 * sin los cheques que eligieron las otras filas.
 */
export default {
	name: 'CarteraCheques',
	components: {
		HorizontalNav: () => import('@/common-vue/components/horizontal-nav/Index'),
		TarjetaCheque: () => import('@/components/common/payment-methods/cartera-cheques/TarjetaCheque'),
	},
	props: {
		/**
		 * Id del <b-modal>: uno por fila (`'cartera-cheques-'+index`), porque un pago puede tener
		 * varios métodos y cada uno con su propio bloque de cheque.
		 */
		id: {
			type: String,
			required: true,
		},
		cheques: {
			type: Array,
			default: () => [],
		},
	},
	data() {
		return {
			banco_seleccionado: 'todos',
			busqueda: '',
		}
	},
	computed: {
		/**
		 * "Todos" primero, seleccionado por defecto, y un item por banco distinto presente en
		 * `cheques`. Un cheque sin banco de catálogo (texto libre o sin cargar) cae en el bucket
		 * fijo "sin-banco": sigue siendo encontrable por el buscador, que sí lee el texto libre.
		 *
		 * @returns {Array}
		 */
		bancos_nav_items() {
			let vistos = new Map()

			this.cheques.forEach(cheque => {
				let id = Number(cheque.cheque_banco_id) || 0
				let clave = id ? String(id) : 'sin-banco'

				if (!vistos.has(clave)) {
					let nombre = id && cheque.cheque_banco && cheque.cheque_banco.name
						? cheque.cheque_banco.name
						: 'Sin banco'
					vistos.set(clave, nombre)
				}
			})

			let bancos = Array.from(vistos.entries())
				.map(([route_value, name]) => ({ route_value, name }))
				.sort((a, b) => a.name.localeCompare(b.name))

			return [{ route_value: 'todos', name: 'Todos' }].concat(bancos)
		},
		/**
		 * `cheques` filtrado por el banco elegido en el nav y por el texto del buscador
		 * (normalizado: sin acentos ni mayúsculas), contra cliente + banco + número.
		 *
		 * @returns {Array}
		 */
		cheques_filtrados() {
			let lista = this.cheques

			if (this.banco_seleccionado !== 'todos') {
				lista = lista.filter(cheque => this.clave_banco(cheque) === this.banco_seleccionado)
			}

			let query = this.normalizar_busqueda(this.busqueda)

			if (!query) {
				return lista
			}

			return lista.filter(cheque => {
				let texto = [
					cheque.client && cheque.client.name,
					this.cheque_banco_texto(cheque),
					cheque.numero,
				].filter(Boolean).join(' ')

				return this.normalizar_busqueda(texto).indexOf(query) !== -1
			})
		},
	},
	methods: {
		clave_banco(cheque) {
			let id = Number(cheque.cheque_banco_id) || 0
			return id ? String(id) : 'sin-banco'
		},
		al_elegir_banco(item) {
			this.banco_seleccionado = item.route_value
		},
		/**
		 * La cartera arranca limpia cada vez que se abre: no arrastra el banco ni el texto de la
		 * vez anterior.
		 *
		 * @returns {void}
		 */
		al_abrir() {
			this.banco_seleccionado = 'todos'
			this.busqueda = ''
		},
		/**
		 * Sube el id del cheque elegido -el mismo valor que antes mandaba el <select>- y cierra
		 * el modal. `CheckInfo.vue` sigue siendo el único que arma el patch de 9 claves
		 * (`set_cheque_a_endosar`).
		 *
		 * @param {Object} cheque
		 * @returns {void}
		 */
		elegir(cheque) {
			this.$emit('elegir', cheque.id)
			this.$bvModal.hide(this.id)
		},
		/**
		 * Sin acentos ni mayúsculas, para que "Perez" encuentre a "Pérez SRL".
		 *
		 * @param {String} texto
		 * @returns {String}
		 */
		normalizar_busqueda(texto) {
			// NFD separa cada letra acentuada en base + marca diacrítica combinante (rango Unicode
			// 0300-036F); sacando esa marca queda la letra sin tilde: "pérez" -> "perez".
			let sin_diacriticos = String.fromCharCode(768) + '-' + String.fromCharCode(879)
			let regex = new RegExp('[' + sin_diacriticos + ']', 'g')

			return (texto || '')
				.toString()
				.toLowerCase()
				.normalize('NFD')
				.replace(regex, '')
				.trim()
		},
	},
}
</script>
<style lang="sass" scoped>
.cartera-cheques__filtros
	margin-bottom: 16px

	// El nav cede ancho (no fuerza su width:100% de siempre) para que el buscador entre en la
	// misma fila sin envolver -mismo criterio que common-vue/views/Abm.vue con abm-search-.
	::v-deep .cont-navs
		width: auto
		flex: 0 1 auto
		min-width: 0

		.cont-left > div
			margin-top: 0

	::v-deep .cont-left
		min-width: 0
		flex-wrap: nowrap

	@media screen and (max-width: 768px)
		::v-deep .cont-left
			flex-wrap: wrap

// Pill de búsqueda "estilo Apple" (lupa a la izquierda, filtra mientras se escribe), por tokens
// para que funcione igual en modo oscuro -mismo lenguaje visual que abm-search/Index.vue, que
// todavía lo tiene con colores fijos-.
.cartera-cheques__buscador
	position: relative
	flex: 0 0 280px
	min-width: 0
	max-width: 340px

	@media screen and (max-width: 768px)
		flex: 1 1 100%
		max-width: none
		margin-top: 10px

	&-lupa
		position: absolute
		left: 14px
		top: 50%
		transform: translateY(-50%)
		font-size: .9rem
		color: var(--color-text-secondary)
		pointer-events: none

	&-input
		width: 100%
		height: 40px
		border: 1px solid var(--color-border)
		border-radius: 22px
		padding: 0 16px 0 38px
		font-size: .9rem
		color: var(--color-text-primary)
		background: var(--bg-card)
		transition: border-color .15s ease, box-shadow .15s ease

		&:focus
			border-color: var(--color-primary)
			box-shadow: 0 0 0 3px var(--metodo-pago-focus-ring)
			outline: none

		&::placeholder
			color: var(--color-text-secondary)

.cartera-cheques__grid
	display: grid
	grid-template-columns: repeat(auto-fill, minmax(240px, 1fr))
	gap: 14px

.cartera-cheques__vacio
	color: var(--color-text-secondary)
	text-align: center
	padding: 30px 0
	margin: 0

</style>
