<template>
<b-modal
:title="'Cambios de precios de '+article.name"
hide-footer
size="lg"
id="price-changes"
@show="al_abrir_modal"
@hidden="al_cerrar_modal">
	<div
	v-if="!loading">
		
		<b-table
		v-if="items.length"
		class="s-2 b-r-1 animate__animated animate__fadeIn"
		head-variant="dark"
		responsive
		stacked="sm"
		striped
		:fields="fields"
		:items="items"
		:tbody-tr-class="row_class">
			<template #cell(cambios_listas)="data">
				<div
				v-for="(cambio, indice) in data.item.cambios_listas"
				:key="indice"
				class="historial-cambio-lista">
					<strong>{{ cambio.lista_nombre || 'Lista eliminada' }}</strong>
					<span class="text-muted"> · {{ cambio.moneda_nombre || 'Pesos' }}</span>
					<div>
						{{ precio_historico(cambio.precio_anterior) }}
						<span aria-label="cambió a"> → </span>
						{{ precio_historico(cambio.precio_nuevo) }}
						<span v-if="cambio.operacion == 'alta'" class="text-muted"> (alta)</span>
						<span v-if="cambio.operacion == 'baja'" class="text-muted"> (baja)</span>
					</div>
				</div>
				<span v-if="!data.item.cambios_listas.length" class="text-muted">Sin detalle por lista</span>
			</template>

			<!--
				Misión historial-precios-proveedor: el precio de proveedor que originó este cambio (sólo
				si la API trae provider_offers) y el vínculo para ver su historial.
			-->
			<template #cell(provider_offers)="data">
				<div
				v-for="offer in data.item.provider_offers"
				:key="offer.id"
				class="historial-cambio-lista">
					<div>{{ etiqueta_de_oferta(offer) }}</div>
					<!-- La pestaña "Historial de precios" sólo existe con article.cost: sin ese permiso no se ofrece -->
					<b-button
					v-if="can('article.cost')"
					size="sm"
					variant="outline-primary"
					class="historial-cambio-vinculo"
					@click="ver_historial_del_proveedor(offer)">Ver historial del proveedor</b-button>
				</div>
			</template>
		</b-table>

		<p 
		v-else
		class="text-with-icon">
			<i class="icon-eye-slash"></i>
			No hay cambios de precios
		</p>
	</div>

	<b-skeleton-table
	class="s-2 b-r-1 m-t-15 animate__animated animate__fadeIn"
	v-else
	:rows="10" 
	:columns="5"
	:table-props="{ bordered: true, striped: true }"
	></b-skeleton-table>
</b-modal>
</template>
<script>
export default {
	data() {
		return {
			price_changes: [],
			loading: false,
			// Id del cambio de precio a destacar (cuando se llega desde el historial del proveedor); null = ninguno.
			highlighted_change_id: null,
		}
	},
	created() {
		this.$root.$on('price-changes:highlight', this.set_highlight)
	},
	beforeDestroy() {
		this.$root.$off('price-changes:highlight', this.set_highlight)
	},
	computed: {
		price_types() {
			return this.$store.state.price_type.models 
		},
		fields() {
			let fields = [
				{
					label: 'Empleado',
					key: 'employee',
				},
				{
					label: 'Fecha',
					key: 'created_at',
				},
			]
			if (this.can('article.cost')) {
				fields.unshift({ label: 'Costo', key: 'cost' })
			}
			// Columna del precio de proveedor: sólo si algún cambio trae ofertas (con una API vieja no hay).
			if (this.tiene_ofertas_de_proveedor) {
				fields.push({ label: 'Precio de proveedor', key: 'provider_offers' })
			}
			if (this.tiene_detalle_de_listas) {
				fields.push({ label: 'Cambios por lista', key: 'cambios_listas' })
				fields.push({ label: 'Origen', key: 'origen' })
			}

			// Una columna por lista, salvo que la única sea la «Precio final» (misión
			// prueba-listas-siempre, 3/11/2026): ahí, el precio final de siempre.
			if (this.listas_visibles.length) {

				this.price_types.forEach(price_type => {
					fields.push({
						label: price_type.name,
						key: 'price_type_'+price_type.id
					})
					// console.log('agregando '+price_type.name)
				})

			} else {
				if (this.can('article.cost')) {
					fields.push({
						label: 'Precio',
						key: 'price',
					})
				}
				fields.push({
					label: 'Precio Final',
					key: 'final_price',
				})
			}

			return fields
		},
		items() {
			let items = []

			this.price_changes.forEach(model => {
				let item = {
					cost: this.price(model.cost),
					price: this.can('article.cost') ? this.price(model.price) : null,
					employee: this.getEmployee(model),
					created_at: this.date(model.created_at, true),
					cambios_listas: Array.isArray(model.cambios_listas) ? model.cambios_listas : [],
					origen: this.origen_historico(model.origen),
					// Id del cambio, para destacar la fila cuando se llega desde el historial del proveedor.
					id: model.id,
					provider_offers: Array.isArray(model.provider_offers) ? model.provider_offers : [],
				}

				if (this.listas_visibles.length) {

					this.price_types.forEach(price_type => {
						let relation_price_type = (model.price_types || []).find(p => p.id == price_type.id)

						if (typeof relation_price_type != 'undefined') {
							item['price_type_'+price_type.id] = this.price(relation_price_type.pivot.final_price)
						}
					})

				} else {
					let precio_final = model.final_price
					// La foto pública de la única lista sigue disponible cuando el API
					// oculta el precio general por el permiso de costos.
					if (typeof precio_final == 'undefined' && this.price_types.length == 1 && Number(this.price_types[0].es_precio_final) == 1) {
						let foto_lista = (model.price_types || []).find(lista => lista.id == this.price_types[0].id)
						if (foto_lista && foto_lista.pivot) {
							precio_final = foto_lista.pivot.final_price
						}
					}
					item.final_price = this.price(precio_final)
				}

				items.push(item)
			})
			return items 
		},
		// True si algún cambio trae precios de proveedor vinculados (la API anterior no manda la clave).
		tiene_ofertas_de_proveedor() {
			return this.price_changes.some(model => Array.isArray(model.provider_offers) && model.provider_offers.length)
		},
		tiene_detalle_de_listas() {
			// El API anterior no trae este campo. Las fotos históricas siguen visibles;
			// no se deduce un "antes" comparando filas que pueden tener huecos.
			return this.price_changes.some(model => Array.isArray(model.cambios_listas) && model.cambios_listas.length)
		},
		article() {
			return this.$store.state.article.model 
		},
	},
	methods: {
		/**
		 * Marca un cambio de precio como destacado (evento 'price-changes:highlight' del historial de
		 * precios por proveedor).
		 * @param {Number} price_change_id Id del cambio de precio.
		 * @return {void}
		 */
		set_highlight(price_change_id) {
			this.highlighted_change_id = price_change_id
		},
		/**
		 * Al cerrar el modal se olvida el destacado, para que la próxima apertura sea la de siempre.
		 * @return {void}
		 */
		al_cerrar_modal() {
			this.highlighted_change_id = null
		},
		/**
		 * Clase de cada fila de la tabla: la del cambio destacado lleva un marco.
		 * @param {Object} item Fila de la tabla.
		 * @return {String}
		 */
		row_class(item) {
			return item && item.id === this.highlighted_change_id ? 'historial-cambio-destacado' : ''
		},
		/**
		 * Texto de un precio de proveedor: "Proveedor · $costo · Importación". Sin permiso de costos la
		 * API omite el costo y queda "Proveedor · Importación".
		 * @param {Object} offer Oferta vinculada al cambio (provider_offers de la API).
		 * @return {String}
		 */
		etiqueta_de_oferta(offer) {
			let partes = [offer.provider_name || 'Proveedor eliminado']
			if (offer.cost !== null && typeof offer.cost != 'undefined') {
				partes.push((Number(offer.moneda_id) === 2 ? 'US' : '') + this.price(offer.cost, false))
			}
			let origenes = { importacion: 'Importación', compra: 'Compra', manual: 'Carga manual' }
			partes.push(origenes[offer.origen] || 'Dato rescatado')
			return partes.join(' · ')
		},
		/**
		 * Vuelve al historial del proveedor con esa oferta destacada: avisa cuál y abre el modal de
		 * proveedores del artículo (cerrando éste, para no apilar modales).
		 * @param {Object} offer Oferta vinculada al cambio.
		 * @return {void}
		 */
		ver_historial_del_proveedor(offer) {
			this.$root.$emit('provider-offers:highlight', offer.id)
			this.$bvModal.hide('price-changes')
			this.$bvModal.show('article-providers')
		},
		origen_historico(origen) {
			let nombres = {
				ficha: 'Ficha del artículo',
				ficha_lista: 'Edición de lista',
				ficha_moneda: 'Precios por moneda',
				recalculo: 'Recálculo',
				recalculo_lote: 'Recálculo en lote',
				importacion: 'Importación',
				reversion_importacion: 'Reversión de importación',
				eliminar_lista: 'Eliminación de lista',
				mercado_libre: 'Mercado Libre',
				duplicar_receta: 'Duplicación de receta',
				migracion_precio_final: 'Migración a Precio final',
				activar_listas: 'Activación de listas',
				desactivar_listas: 'Desactivación de listas',
			}
			return nombres[origen] || origen || 'Sin registro de origen'
		},
		precio_historico(valor) {
			return valor === null || typeof valor == 'undefined' ? 'Sin precio' : this.price(valor)
		},
		// Se dispara con el @show del propio modal.
		al_abrir_modal() {
			console.log('SE ABRIO MODAL')
			console.log('y era price-changes')
			setTimeout(() => {
				if (!this.loading) {
					this.getPriceChanges()
				}
			}, 500)
		},
		getEmployee(price_change) {
			if (price_change.empleado_nombre) {
				return price_change.empleado_nombre
			}
			let employee_id = price_change.employee_id
			if (employee_id) {
				if (employee_id == this.owner.id) {
					return this.owner.name 
				}
				let employee = this.$store.state.employee.models.find(employee => {
					return employee.id == employee_id
				})
				if (typeof employee != 'undefined') {
					return employee.name 
				}
			}
			return null
		},
		getPriceChanges() {
			if (!this.loading) {
				console.log('getPriceChanges')
				this.loading = true 
				this.$api.get('price-change/'+this.article.id)
				.then(res => {
					this.loading = false 
					this.price_changes = res.data.models 
				})
				.catch(err => {
					this.loading = false 
					this.$toast.error(err)
				})
			}
		}
	}
}
</script>
<style scoped lang="sass">
.historial-cambio-lista
	min-width: 180px
	white-space: normal
	& + &
		margin-top: .6rem

// Botón de vínculo al historial del proveedor: tocable en teléfono.
.historial-cambio-vinculo
	margin-top: 4px
	min-height: 40px

@media (min-width: 576px)
	.historial-cambio-vinculo
		min-height: 0
</style>
<!-- Sin scoped: la fila la dibuja b-table y el modal se monta fuera del componente. -->
<style lang="sass">
// Cambio destacado al llegar desde el historial del proveedor: marco del color primario (tema claro y oscuro).
#price-changes .table > tbody > tr.historial-cambio-destacado
	outline: 2px solid var(--color-primary)
	outline-offset: -2px

// Teléfono (menos de 576 px): la tabla se apila (stacked="sm", el mismo patrón del modal de proveedores)
// para que "Precio de proveedor" y su botón queden a la vista sin scroll horizontal.
@media (max-width: 575.98px)
	#price-changes .table.b-table.b-table-stacked-sm > tbody > tr > [data-label]
		// En teléfono cada etiqueta ocupa su propia línea y el valor usa el ancho completo; el reparto
		// 40/60 de Bootstrap heredaría el nowrap global y superpondría etiquetas largas.
		&::before
			display: block
			float: none
			width: 100%
			padding: 0
			margin-bottom: 4px
			text-align: left
			white-space: normal
			color: var(--color-text-secondary)
			font-size: 0.75rem

		> div
			display: block
			width: 100%
			padding: 0
			white-space: normal

	// El botón "Ver historial del proveedor" ocupa el ancho completo y es tocable.
	#price-changes .historial-cambio-vinculo
		display: block
		width: 100%
		min-height: 40px
</style>
