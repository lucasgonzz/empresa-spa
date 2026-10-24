<template>
	<div>
		<b-form-group
		description="Si quiere restar unidades, coloque el numero en negativo. Ejemplo: para quitar 10, coloque -10"
		label="Cantidad a agregar">
			<b-form-input
			id="stock-movement-amount"
			@keyup.enter="save"
			v-model="amount_"
			placeholder="Ingrese cantidad"></b-form-input>
		</b-form-group>

		<div
		class="m-b-10"
		v-if="article.unidades_individuales">
			<p>
				
				<strong>
					Este articulo tiene indicado unidades individuales, el valor que agregue se multiplicara por las {{ numero_es(article.unidades_individuales) }} unidades individuales
				</strong>
			</p>
			<p
			v-if="amount_ != ''">
				<strong>
					Unidades a agregar: {{ numero_es(unidades_a_agregar) }}
				</strong>
			</p>
		</div>

		<b-form-group
		v-if="amount_ >= 1"
		label="Proveedor">
			<search-component
			ref="search_component"
			:model="article"
			:prop="{key: 'provider_id', text: 'Proveedor', search_from_api: true}"
			id="stock-movement-search-povider"
			@setSelected="setSelectedProvider"
			model_name="provider"
			show_btn_create
			clear_query 
			save_if_not_exist
			auto_select></search-component>
		</b-form-group>



		<!-- Variante -->
		<b-form-group
		v-if="article.article_variants.length"
		label="Variante">
			<b-form-select
			v-model="article_variant_id"
			:options="article_variant_options"></b-form-select>
		</b-form-group>



		<!--
			Depósito destino. Misión sucursal-siempre (23/10/2026, D5, aprobada por Lucas):

			- Con dos o más sucursales se muestra SIEMPRE, también para un artículo con stock global sin
				repartir. Hasta acá, para ese artículo se escondía el selector, se mostraba "primero divida
				el stock global…" y a la vez check() exigía el depósito: el modal no dejaba guardar (2R,
				23/10/2026, 488 artículos). Ahora la API, antes de aplicar el movimiento, pasa el global
				entero a la sucursal principal (D4 de empresa-api), así que elegir depósito ya no pierde nada.
			- Con una sola sucursal no hay selector ni se exige: el movimiento sale con el id de esa
				sucursal, la principal (ver setDefaultAddress), y no con un 0.
		-->
		<b-form-group
		v-if="muestra_sucursales"
		label="Deposito DESTINO">
			<b-form-select
			v-model="to_address_id"
			:options="addresses_options"></b-form-select>
		</b-form-group>



		<!-- Observaciones -->
		<b-form-group
		label="Observaciones">
			<b-form-textarea
			v-model="observations"
			dusk="stock-movement-observations"
			placeholder="Ingerse alguna observacion..."></b-form-textarea>
		</b-form-group>

		<btn-loader
		dusk="btn_guardar_stock_movement"
		@clicked="save"
		:loader="loading"
		text="Guardar"></btn-loader>
	</div>
</template>
<script>
import { ref } from 'vue'
export default {
	components: {
		SearchComponent: () => import('@/common-vue/components/search/Index'),
		BtnLoader: () => import('@/common-vue/components/BtnLoader'),
	},
	computed: {
		/*
			El redondeo NO es cosmetico: mata la basura del float de la multiplicacion.
			`Number(amount_) * Number(unidades_individuales)` con 12 x 102.88 da
			1234.5600000000002 en JavaScript, y eso se mostraba tal cual en pantalla.
			Redondear a 4 decimales borra el arrastre binario sin tocar ningun decimal real
			(el stock es decimal(12,2) en la base), y el Number() de afuera saca los ceros
			de mas, asi que un 2 exacto se sigue viendo "2" y no "2,0000".

			Es display puro: no se guarda ni se manda a la API.
		*/
		unidades_a_agregar() {
			const producto = Number(this.amount_) * Number(this.article.unidades_individuales)
			if (isNaN(producto)) {
				return 0
			}
			return Number(producto.toFixed(4))
		},
		article() {
			return this.$store.state.article.model 
		},
		addresses() {
			return this.$store.state.address.models
		},
		article_variant_options() {
			let options = [{
				value: 0,
				text: 'Seleccione Variante'
			}]

			this.article.article_variants.forEach(article_variant => {
				options.push({
					value: article_variant.id,
					text: article_variant.variant_description,
				})
			})
			return options
		},
		addresses_options() {
			if (
				!this.is_admin 
				&& this.can('article.edit_stock_only_sucursal') 
				&& this.user.address_id
			) {
				let options = [
					{
						text: 'Seleccione deposito',
						value: 0,
					},
				]

				/*
					Mision eliminar-sucursal-con-stock (5/10/2026): la sucursal del usuario puede haber
					sido eliminada (el `user.address_id` de esta sesion quedo con el id viejo). Antes
					el `.find(...)` devolvia undefined y `.street` tiraba un TypeError que rompia el
					modal entero. Ahora, sin la sucursal, no se ofrece: mover stock hacia un deposito
					que no existe es justo lo que esta mision cierra.
				*/
				let user_address = this.addresses.find(a => a.id == this.user.address_id)

				if (user_address) {
					options.push({
						text: user_address.street,
						value: this.user.address_id
					})
				}

				return options
			}
			return this.getOptions({key: 'to_address_id', text: 'Deposito', store: 'address'})
		}
	},
	data() {
		return {
			to_address_id: 0,
			article_variant_id: 0,
			amount_: '',
			observations: '',
			loading: false,
		}
	},
	/**
	 * Preselecciona el depósito destino en cada apertura del modal.
	 *
	 * Hasta el 23/10/2026 esto colgaba de `bv::modal::show` por el bus de $root, y ese handler no
	 * corría nunca: el <b-modal> del padre no lleva `static`, así que bootstrap-vue crea este
	 * componente DESPUÉS de emitir el evento de su propia apertura (medido el 16/9/2026: tres
	 * aperturas, cero preselecciones). En ese momento se decidió no arreglarlo para no cambiar lo que
	 * el usuario ve. Lucas lo aprobó el 23/10/2026 (misión sucursal-siempre, D5): este componente se
	 * crea una vez por apertura, así que su created() es el evento que se buscaba.
	 *
	 * @returns {void}
	 */
	created() {
		this.setDefaultAddress()
	},
	methods: {
		setSelectedProvider(result) {
			this.$set(this.article, 'provider', result.model)
			this.article.provider_id = result.model.id
		},
		save() {
			if (this.check()) {
				this.loading = true 
				this.$api.post('stock-movement', {
					model_id: this.article.id, 
					amount: this.amount_,
					observations: this.observations,
					provider_id: this.article.provider_id,
					to_address_id: this.to_address_id,
					article_variant_id: this.article_variant_id,
				})
				.then(res => {
					this.loading = false 
					this.$toast.success('Movimiento guardado')
					this.$bvModal.hide('stock-movement')

					// this.$bvModal.hide('article') 
					
					this.setTemporalId(res.data.model)
					
					if (!this.article.id) {
						this.article.stock = this.amount_
					}
					if (this.article.id) {

						this.loadModel('article', this.article.id)
						this.article.stock = Number(this.article.stock) + Number(this.amount_)

						// if (this.article.addresses.length) {
						// 	setTimeout(() => {
						// 		let store_article = this.$store.state.article.models.find(_article => {
						// 			return _article.id == this.article.id
						// 		})
						// 		console.log('se va a actualizar addresses con')
						// 		console.log(store_article.addresses)
						// 		this.setModel(store_article, 'article', [], false)
						// 	}, 1500)
						// }
					}
				})
				.catch(err => {
					this.loading = false 
					console.log(err)
				})
			}
		},
		check() {
			// El depósito se exige solo cuando el selector está a la vista (dos o más sucursales,
			// misión sucursal-siempre D5). Con una sola, viaja la principal.
			if (this.muestra_sucursales && this.to_address_id == 0) {
				this.$toast.error('Indique el deposito')
				return false
			}

			if (this.article.article_variants.length 
				&& !this.article_variant_id) {

				this.$toast.error('Indique la variante')
				return false 
			}

			if (this.article.article_variants.length
				&& this.article.article_variants[0].addresses.length
				&& this.muestra_sucursales
				&& this.to_address_id == 0
				) {

				this.$toast.error('Indique el deposito')
				return false 
			}
			return true
		},
		setTemporalId(created_stock_movement) {
			if (!this.article.id) {
				if (!this.article.childrens) {
					this.$set(this.article, 'childrens', [])
				}
				let new_childrens = [{
					model_name: 'stock_movement',
					temporal_id: created_stock_movement.temporal_id
				}]
				this.$set(this.article, 'childrens', this.article.childrens.concat(new_childrens))
				console.log('childrens:')
				console.log(this.article.childrens)
			}
		},
		/**
		 * Deja elegido el depósito destino (misión sucursal-siempre, 23/10/2026, D5):
		 *
		 * - Con una sola sucursal no hay selector, pero el movimiento lleva el id de esa sucursal (la
		 *   principal) en vez de un 0: así anda también si esta SPA habla con una API vieja durante un
		 *   despliegue, que no tiene la red que lleva a la principal lo que llega sin sucursal.
		 * - Si la persona solo puede cargar stock en su sucursal (`article.edit_stock_only_sucursal`),
		 *   la suya, que es la única opción que le ofrece `addresses_options`.
		 * - Si no, la sucursal principal.
		 *
		 * @returns {void}
		 */
		setDefaultAddress() {
			if (this.to_address_id != 0) {
				return
			}

			if (!this.muestra_sucursales) {
				if (this.sucursal_principal) {
					this.to_address_id = this.sucursal_principal.id
				}
				return
			}

			if (
				!this.is_admin
				&& this.can('article.edit_stock_only_sucursal')
				&& this.user.address_id
			) {
				// La sucursal del usuario pudo haberse eliminado: solo se preselecciona si existe.
				let user_address = this.addresses.find(a => a.id == this.user.address_id)
				if (user_address) {
					this.to_address_id = user_address.id
				}
				return
			}

			let principal = this.sucursal_principal
			if (principal) {
				this.to_address_id = principal.id
			}
		},
	}
}
</script>