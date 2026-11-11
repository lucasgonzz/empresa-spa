<template>
<b-modal
:title="'Cambios de precios de '+article.name"
hide-footer
size="lg"
id="price-changes"
@show="al_abrir_modal">
	<div
	v-if="!loading">
		
		<b-table
		v-if="items.length"
		class="s-2 b-r-1 animate__animated animate__fadeIn"
		head-variant="dark"
		responsive
		striped
		:fields="fields"
		:items="items">
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
		}
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
</style>
