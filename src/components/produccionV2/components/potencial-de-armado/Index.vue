<template>
	<div
	v-if="view == 'potencial-de-armado'"
	class="potencial-de-armado">

		<div class="potencial-de-armado__header m-b-15">
			<p class="potencial-de-armado__explicacion">
				Con las partes que YA tenes terminadas en stock, cuantas unidades de cada producto
				podrias armar. Es de un solo nivel a proposito: no baja a la receta de cada insumo.
			</p>
			<b-button
			variant="outline-primary"
			size="sm"
			:disabled="loading"
			@click="recalcular">
				<i class="icon-refresh m-r-5"></i>
				Recalcular
			</b-button>
		</div>

		<div
		v-if="loading"
		class="j-center m-t-30 m-b-30">
			<b-spinner></b-spinner>
		</div>

		<!--
			El error se muestra con el mensaje del backend. Una tabla vacia sin explicacion se
			lee como "no tenes con que armar nada", que es lo contrario de lo que paso.
		-->
		<b-alert
		v-else-if="error"
		show
		variant="warning">
			{{ error }}
		</b-alert>

		<p
		v-else-if="!models.length"
		class="text-with-icon">
			<i class="icon-check"></i>
			Todavia no hay recetas cargadas
		</p>

		<div
		v-else>

			<p
			v-if="hay_deposito_por_ruta"
			class="text-with-icon potencial-de-armado__aclaracion">
				<i class="icon-info"></i>
				Hay rutas con deposito de insumos configurado: en esas, el potencial se calculo con
				el stock de ESE deposito y no con el total del insumo.
			</p>

			<!--
				responsive + min-width en el sass: en tablet y en telefono la tabla scrollea
				adentro de su propio contenedor, sin empujar el scroll horizontal a la pagina.
			-->
			<b-table
			class="potencial-de-armado__tabla"
			head-variant="dark"
			responsive
			:fields="fields"
			:items="models">

				<template #cell(stock_actual)="data">
					{{ mostrar_numero(data.item.stock_actual) }}
				</template>

				<template #cell(potencial)="data">
					<span class="potencial-de-armado__potencial">
						{{ mostrar_numero(data.item.potencial) }}
					</span>
				</template>

				<template #cell(vendibles)="data">
					{{ mostrar_numero(data.item.vendibles) }}
				</template>

				<!--
					El insumo limitante es el dato que dispara la accion: es lo que hay que
					comprar. Por eso va el nombre y, abajo, cuanto stock hay contra cuanto
					lleva cada unidad.
				-->
				<template #cell(insumo_limitante)="data">
					<span
					v-if="data.item.sin_ruta"
					class="potencial-de-armado__sin-datos">
						Esta receta no tiene ruta cargada
					</span>
					<span
					v-else-if="data.item.sin_insumos"
					class="potencial-de-armado__sin-datos">
						La ruta no tiene insumos cargados
					</span>
					<div
					v-else-if="data.item.insumo_limitante">
						{{ data.item.insumo_limitante.article_name }}
						<span class="potencial-de-armado__detalle d-block">
							Stock {{ mostrar_numero(data.item.insumo_limitante.stock) }}
							/ {{ mostrar_numero(data.item.insumo_limitante.cantidad_por_unidad) }} por unidad
						</span>
					</div>
					<span
					v-else
					class="potencial-de-armado__sin-datos">
						-
					</span>
				</template>

				<template #cell(recipe_route_nombre)="data">
					{{ data.item.recipe_route_nombre ? data.item.recipe_route_nombre : 'Sin tipo de ruta' }}
					<span
					v-if="data.item.renglones_ignorados > 0"
					class="potencial-de-armado__detalle d-block">
						{{ data.item.renglones_ignorados }} insumo(s) sin cantidad cargada, ignorados
					</span>
				</template>

			</b-table>
		</div>
	</div>
</template>
<script>
export default {
	data() {
		return {
			/* Filas que devuelve GET /potencial-de-armado, tal cual vienen. */
			models: [],
			/* Evita volver a pedir el calculo cada vez que se entra a la solapa. */
			potencial_pedido: false,
			loading: false,
			error: '',
		}
	},
	created() {
		/* Si el componente ya entra apuntando al potencial, calculamos de una. */
		if (this.view == 'potencial-de-armado') {
			this.get_potencial()
		}
	},
	watch: {
		view(new_view) {
			/* Si se entra a la solapa despues de creado, calculamos en ese momento. */
			if (new_view == 'potencial-de-armado') {
				this.get_potencial()
			}
		},
	},
	computed: {
		fields() {
			return [
				{
					label: 'Producto',
					key: 'article_name',
				},
				{
					label: 'Stock actual',
					key: 'stock_actual',
				},
				{
					label: 'Se pueden armar',
					key: 'potencial',
				},
				{
					label: 'Vendibles',
					key: 'vendibles',
				},
				{
					label: 'Insumo limitante',
					key: 'insumo_limitante',
				},
				{
					label: 'Ruta',
					key: 'recipe_route_nombre',
				},
			]
		},
		/*
			Hay al menos una receta cuyo potencial salio del stock de un deposito y no del
			total. Se compara contra null y contra 0 explicitamente: address_id puede venir
			como 0 desde un select, y 0 no es un deposito.
		*/
		hay_deposito_por_ruta() {
			return this.models.some(function(model) {
				if (model.address_id === null || typeof model.address_id == 'undefined') {
					return false
				}
				return Number(model.address_id) !== 0
			})
		},
	},
	methods: {
		/**
		 * Pide el calculo una sola vez por sesion de pantalla.
		 *
		 * @returns {void}
		 */
		get_potencial() {
			if (this.potencial_pedido) {
				return
			}
			this.pedir_potencial()
		},
		/**
		 * Boton "Recalcular": vuelve a pedirle el numero al backend. Existe porque este es un
		 * numero que se mueve con cada movimiento de stock, y el usuario tiene que poder verlo
		 * actualizado sin recargar toda la pantalla.
		 *
		 * @returns {void}
		 */
		recalcular() {
			this.pedir_potencial()
		},
		/**
		 * Trae el potencial de armado de todas las recetas.
		 *
		 * El calculo lo hace entero el backend: aca no se recalcula ni se corrige nada, solo se
		 * muestra lo que vino.
		 *
		 * @returns {void}
		 */
		pedir_potencial() {
			let self = this

			this.potencial_pedido = true
			this.loading = true
			this.error = ''
			this.$store.commit('auth/setMessage', 'Calculando potencial de armado')
			this.$store.commit('auth/setLoading', true)

			this.$api.get('/potencial-de-armado')
			.then(function(res) {
				self.models = res.data.models ? res.data.models : []
				self.loading = false
				self.$store.commit('auth/setLoading', false)
				self.$store.commit('auth/setMessage', '')
			})
			.catch(function(err) {
				console.log(err)
				self.models = []
				self.loading = false
				/* Si fallo, que el proximo ingreso a la solapa vuelva a intentar. */
				self.potencial_pedido = false
				self.error = 'No se pudo calcular el potencial de armado'
				if (err.response && err.response.data && err.response.data.message) {
					self.error = err.response.data.message
				}
				self.$store.commit('auth/setLoading', false)
				self.$store.commit('auth/setMessage', '')
			})
		},
		/**
		 * Muestra un numero que puede llegar como string decimal de MySQL ("0.00").
		 *
		 * Solo formatea: no decide nada. Si no es numerico, se muestra tal cual vino.
		 *
		 * @param {Number|String} valor Valor crudo del payload.
		 * @returns {String}
		 */
		mostrar_numero(valor) {
			if (valor === null || typeof valor == 'undefined' || valor === '') {
				return '-'
			}
			let numero = Number(valor)
			if (isNaN(numero)) {
				return String(valor)
			}
			return String(numero)
		},
	},
}
</script>
<style lang="sass">
.potencial-de-armado
	&__header
		display: flex
		flex-wrap: wrap
		align-items: center
		justify-content: space-between
		gap: 10px
	&__explicacion
		// En telefono el texto se queda con el ancho entero y el boton baja abajo, en vez de
		// quedar los dos espichados en la misma linea.
		flex: 1 1 260px
		margin-bottom: 0
	&__aclaracion
		font-size: .9rem
	&__tabla
		// responsive + min-width: las seis columnas no entran en tablet (768-1024) ni en
		// telefono. Con esto la tabla scrollea horizontal adentro de su contenedor en vez de
		// espichar "Producto" e "Insumo limitante" hasta una letra por linea. Mismo criterio
		// que la tabla de actividad-cliente.
		min-width: 820px
	&__potencial
		font-weight: 600
		font-size: 1.05rem
	&__detalle
		font-size: .8rem
		opacity: .75
	&__sin-datos
		font-size: .85rem
		opacity: .75
</style>
