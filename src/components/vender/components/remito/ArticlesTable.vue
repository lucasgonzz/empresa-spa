<template>
<div>
	<hr>
	<b-row>
		<b-col>
			<b-table
			class="b-r-1"
			v-if="items.length"
			:key="fields_signature"
			:items="table_items"
			head-variant="dark"
			:fields="fields"
			responsive
			hover>
				<template #cell(attachments)="data">
					<item-attachments
					:item="items[data.index]"
					:sale-id="previus_sale && previus_sale.id ? previus_sale.id : null"></item-attachments>
				</template>

				<template #cell(price_vender)="data">
					<b-input-group
					v-if="can('article.vender.change_price') || items[data.index].default_in_vender || se_creo_en_vender(items[data.index])"
					class="input-price m-b-10">

						<div class="cont-input-price">
							<b-form-input
							placeholder="Personalizado"
							@keyup.enter="add_varios_precios(items[data.index], true)"
							@keyup="callSetTotal(false)" 
							type="number"
							:data-testid="'venta-item-precio-'+items[data.index].id"
							:id="'price-vender-'+items[data.index].id"
							min="0"
							v-model="items[data.index].price_vender_personalizado"></b-form-input>

							<b-popover
							:target="'price-vender-'+items[data.index].id" 
							triggers="hover" 
							placement="left">
							    <template #title><strong>Instrucciones</strong></template>
							    Si completa este campo, <strong>no se aplicaran recargos individuales ni descuentos/recargos por metodo de pago</strong> a este precio. Solo se aplicaran descuentos individuales
							 </b-popover>

							<div
							class="varios-precios"
							v-if="items[data.index].varios_precios">
								<div
								v-for="otro_precio in items[data.index].varios_precios"
								class="otro-precio">
									<b-form-input 
									@keyup.enter.stop="calculate_price_vender(items[data.index])"
									v-model="otro_precio.price_vender"
									type="number" />

									<b-form-input 
									class="input-amount"
									v-model="otro_precio.amount"
									:min="1"
									@change="enter_amount(items[data.index])"
									@keyup.enter.prevent="enter_amount(items[data.index])"
									placeholder="Cantidad"
									type="number" />

									<b-button
									size="sm"
									@click="remove_otro_precio(items[data.index], otro_precio)"
									variant="danger">
										<i class="icon-trash"></i>
									</b-button>
								</div>
							</div>
						</div>

					</b-input-group>
					<span
					v-if="items[data.index].calculated_price_vender">
						{{ price(items[data.index].calculated_price_vender) }}
					</span>
					<span
					v-else>
						{{ price(items[data.index].price_vender) }}
					</span>
				</template>


				<template #cell(name)="data">
					<b-input-group
					v-if="can_edit_item_name(items[data.index])"
					class="input-name m-b-10">
						<b-form-input
						:placeholder="get_item_name_placeholder(items[data.index])"
						:id="'name-vender-'+items[data.index].id"
						v-model="items[data.index].name_vender_personalizado"></b-form-input>
					</b-input-group>
					<span
					v-if="!can_edit_item_name(items[data.index]) || !items[data.index].name_vender_personalizado">
						{{ getItemDisplayName(items[data.index]) }}
					</span>
				</template>

				
				<template #cell(article_variant_id)="data">
					<p
					v-if="items[data.index].article_variant_id">
						{{ items[data.index].variant_description }}
					</p>
					<!-- <b-input-group
					v-if="items[data.index].is_article && items[data.index].article_variants.length"
					class="input-discount">
						<b-form-select
						:options="article_variant_options(items[data.index])"
						v-model="items[data.index].article_variant_id"></b-form-select>
					</b-input-group> -->
				</template>

				
				<template #cell(amount)="data">
					<b-input-group
					class="input-discount">
						<b-form-input
						:disabled="previus_sale != null && previus_sale.to_check == 1"
						@keyup="callSetTotal(true, items[data.index])"
						@click="callSetTotal(true, items[data.index])"
						type="number"
						min="0"
						:data-testid="'venta-item-cantidad-'+items[data.index].id"
						:dusk="'amount_'+data.index"
						v-model="items[data.index].amount"></b-form-input>
					</b-input-group>
				</template>

				<template #cell(unidades_individuales)="data">
					<b-input-group
					class="unidades-individuales">
						<b-form-input
						type="number"
						min="0"
						@keyup.enter="calcular_precio_por_unidades_individuales(items[data.index])"
						v-model="items[data.index].unidades_individuales"
						placeholder="Div Por"></b-form-input>
						<b-form-input
						type="number"
						min="0"
						@keyup.enter="calcular_precio_por_unidades_individuales(items[data.index])"
						v-model="items[data.index].unidades_individuales_en_esta_venta"
						placeholder="Div En"></b-form-input>
					</b-input-group>
				</template>

				<template #cell(discount)="data">
					<b-input-group
					v-if="items[data.index].is_article"
					class="input-discount"
					prepend="%">
						<b-form-input
						@keyup="callSetTotal(false)"
						@click="callSetTotal(false)"
						type="number"
						:placeholder="get_max_discount(items[data.index])"
						min="0"
						v-model="items[data.index].discount"></b-form-input>
					</b-input-group>
				</template>

				<template #cell(price_type_personalizado_id)="data">
					
					<price-type
					:item="items[data.index]"></price-type>
				
				</template>

				<template #cell(checked_amount)="data">
					<strong
					class="text-danger p-b-10"
					v-if="items[data.index].checked_amount && items[data.index].checked_amount == items[data.index].amount">
						Se elimino
					</strong>
					<b-input-group
					:class="checked_amount_input_class(items[data.index])"
					class="input-checked-amount">
						<div 
						class="prepend">
							<i class='icon-edit'></i>
						</div>
						<b-form-input
						@keyup="setCheckedItems(items[data.index])"
						:disabled="!previus_sale.to_check"
						type="number"
						min="0"
						v-model="items[data.index].checked_amount"></b-form-input> 
					</b-input-group>
				</template>

				<!-- <template #cell(returned_amount)="data">
					<b-input-group
					class="input-discount">
						<b-form-input
						@keyup="setReturnedItems(items[data.index])"
						@click="setReturnedItems(items[data.index])"
						type="number"
						min="0"
						v-model="items[data.index].returned_amount"></b-form-input>
					</b-input-group>
				</template> -->
				<template #cell(delivered_amount)="data">
					<b-input-group
					class="input-discount">
						<b-form-input
						type="number"
						min="0"
						v-model="items[data.index].delivered_amount"></b-form-input>
					</b-input-group>
				</template>
				<template #cell(options)="data">
					<div class="options">
						<!-- <b-button 
						v-if="items[data.index].article_variants.length"
						@click="peretir_articulo(items[data.index])"
						variant="primary"
						class="btn-options"
						size="sm">
							<i class="icon-refresh"></i>
						</b-button> -->

						<b-button 
						v-if="previus_sale === null || !previus_sale.to_check"
						@click="removeItem(items[data.index])"
						variant="danger"
						class="btn-options"
						size="sm">
							<i class="icon-trash"></i>
						</b-button>
					</div>
				</template>

				<!-- Columnas configurables de tipo imagen: slot dinamico por cada una elegida por el usuario -->
				<template
				v-for="prop in image_dynamic_fields"
				v-slot:[cell_slot_name(prop.key)]="data">
					<table-thumbnail-images
					:key="'thumb-'+items[data.index].id+'-'+prop.key"
					:model="items[data.index]"
					:prop="prop"></table-thumbnail-images>
				</template>
			</b-table>
			<!-- Estado vacío: se muestra cuando el remito aún no tiene artículos -->
			<div
			v-else
			dusk="text_remito"
			class="remito-empty-state">
				<div class="remito-empty-state__icon">
					<i class="icon-list"></i>
				</div>
				<p class="remito-empty-state__title">
					Aún no hay artículos
				</p>
				<p class="remito-empty-state__hint">
					Buscá o escaneá un código para agregar el primero
				</p>
			</div>
		</b-col>
	</b-row>
</div>
</template>
<script>
import vender from '@/mixins/vender/index'
import vender_set_total from '@/mixins/vender_set_total'
import previus_sales from '@/mixins/vender/previus_sale/index'
import check_stock from '@/mixins/vender/check_stock'
/*
	"Varios precios" (agregar una fila, recalcular el renglon) vive en un mixin desde la mision
	balanzas-configurables (3/10/2026): lo comparte con el ticket de balanza de ArticleBarCode.vue. El
	foco despues del Enter sigue siendo de este componente (foco_despues_de_varios_precios).
*/
import varios_precios, { tiene_varios_precios } from '@/mixins/vender/varios_precios'
/*
	El foco de vuelta al codigo de barras (al sacar un renglon, al terminar de personalizar un
	precio) va a la primera entrada A LA VISTA: con los diseños de Vender el codigo de barras puede
	estar sacado o plegado. Ver layout/foco.js.
*/
import { enfocar_primera_entrada_de_articulos } from '@/components/vender/layout/foco'
export default {
	mixins: [vender, vender_set_total, previus_sales, check_stock, varios_precios],
	components: {
		PriceType: () => import('@/components/vender/components/remito/table-slots/PriceType'),
		ItemAttachments: () => import('@/components/vender/components/remito/table-slots/ItemAttachments'),
		TableThumbnailImages: () => import('@/common-vue/components/display/table/TableThumbnailImages'),
	},
	watch: {
		special_price_id() {
			this.setArticlesPrice()
			this.setTotal()
			// this.$store.commit('vender/setTotal')
		},
	},
	computed: {
		// topMarginClass() {
		// 	return this.$store.state.auth.user?.inputs_size?.slug === 'small' ? 'm-t-10' : 'm-t-70'
		// },
		special_price_id() {
			return this.$store.state.vender.special_price_id
		},
		articles() {
			return this.$store.state.vender.articles
		},
		combos() {
			return this.$store.state.vender.combos
		},
		fields() {
			let fields = []

			if (this.hasExtencion('adjuntar_archivos_en_vantas')) {
				fields.push({ key: 'attachments', label: 'Adj.' })
			}

			/* Bloque configurable: orden, visibilidad y ancho elegidos por el usuario. */
			/* Incluye "Cantidad" con posicion configurable pero visibilidad bloqueada */
			/* (locked_visible en vender.js) — unico lugar para editar la cantidad del item. */
			fields = fields.concat(this.dynamic_table_fields)

			if (this.hasExtencion('article_variants')) {

				let columna_variante = {
					key: 'article_variant_id', label: 'Variante'
				}

				/*
					La columna Variante va pegada a la derecha de "Nombre" y no al final del bloque
					configurable: la variante es parte de la identidad del renglon (es lo que distingue
					"Zapatilla Azul 36" de "Zapatilla Rojo 38") y tiene que verse junto al nombre.
					Al final, con las columnas configurables de una cuenta real (precio, descuento,
					total, cantidad, fechas...) la tabla se ensancha mas que la pantalla y "Variante"
					quedaba fuera de vista hasta scrollear de costado: medido en vivo, 1727 px de tabla
					contra 1308 px visibles a 1440 px de ancho.

					Si el usuario saco "Nombre" de sus columnas configurables no hay a donde pegarla y
					se agrega al final del bloque, como se hacia antes. El gate (extension), el key y el
					label no cambian: el slot #cell(article_variant_id) y dedicated_keys dependen de
					ellos.
				*/
				let index_nombre = fields.findIndex(field => field.key == 'name')

				if (index_nombre != -1) {
					fields.splice(index_nombre + 1, 0, columna_variante)
				} else {
					fields.push(columna_variante)
				}
			}

			// if (this.hasExtencion('unidades_individuales_en_articulos')) {
			// 	fields.push(
			// 		{ key: 'unidades_individuales', label: 'U. Individuales' },
			// 	)
			// }
			if (this.editando_venta_previa) {
				if (this.hasExtencion('check_sales') && !this.previus_sale.confirmed && (this.previus_sale.to_check || this.previus_sale.checked)) {
					fields.push(
						{ key: 'checked_amount', label: 'U. chequeadas' },
					)
				}
				// if (!this.hasExtencion('check_sales') || (!this.previus_sale.to_check && !this.previus_sale.checked)) {
				// 	fields.push(
				// 		{ key: 'returned_amount', label: 'U. Devueltas' },
				// 	)
				// }
				if (this.hasExtencion('acopios')) {
					fields.push(
						{ key: 'delivered_amount', label: 'U. Entregadas' },
					)
				}
			}

			/* Fija: columna de acciones (boton eliminar), igual que en el resto del sistema */
			fields.push({ key: 'options', label: 'Opciones' })

			return fields
		},
		/**
		 * Firma de la configuracion de columnas (key + ancho + salto de linea) usada como :key
		 * del b-table. BootstrapVue no siempre recalcula el layout de columnas cuando solo
		 * cambian propiedades internas de `fields` (ej. thStyle) sin que cambie la instancia del
		 * componente — forzar el remount con este key es lo que hace que el ancho se vea
		 * actualizado apenas se guarda, sin necesidad de recargar la pagina.
		 *
		 * @returns {string}
		 */
		fields_signature() {
			return this.fields
				.map(field => {
					let width = field.thStyle && field.thStyle.minWidth ? field.thStyle.minWidth : ''
					return field.key + ':' + width + ':' + (field.tdClass || '')
				})
				.join('|')
		},
		/**
		 * Filas configurables (props_to_show del store) ya filtradas por los gates dinamicos
		 * que no se pueden expresar como extension estatica (permiso de descuento, listas de
		 * precio cargadas). Devuelve los objetos de propiedad COMPLETOS (no un resumen) porque
		 * dynamic_table_fields, table_items e image_dynamic_fields los necesitan para resolver
		 * relaciones/fechas/imagenes con propertyText/isImageProp.
		 *
		 * @returns {Array}
		 */
		dynamic_fields() {
			let props_to_show = this.$store.state.vender.props_to_show || []

			return props_to_show.filter(prop => {
				if (prop.key == 'discount') {
					return this.can('vender.article_discount')
				}
				if (prop.key == 'price_type_personalizado_id') {
					return this.price_types.length > 0
				}
				return true
			})
		},
		/**
		 * Columnas de b-table para el bloque configurable, derivadas de dynamic_fields.
		 *
		 * @returns {Array}
		 */
		dynamic_table_fields() {
			return this.dynamic_fields.map(prop => ({
				key: prop.key,
				label: this.propText(prop, true, true),
				tdClass: prop.table_wrap_content ? '' : 'text-nowrap',
				thStyle: prop.table_width ? { minWidth: prop.table_width + 'px' } : {},
			}))
		},
		/**
		 * Subconjunto de dynamic_fields de tipo imagen: necesitan el slot dedicado
		 * (table-thumbnail-images) en vez de texto plano vía propertyText.
		 *
		 * @returns {Array}
		 */
		image_dynamic_fields() {
			return this.dynamic_fields.filter(prop => this.isImageProp(prop))
		},
		items() {
			return this.$store.state.vender.items
		},
		table_items() {
			let self = this
			let dedicated_keys = {
				price_vender: true,
				name: true,
				amount: true,
				article_variant_id: true,
				discount: true,
				price_type_personalizado_id: true,
				checked_amount: true,
				delivered_amount: true,
				attachments: true,
				options: true,
				total: true,
			}

			return this.items.map(function (item) {
				let computed_item = Object.assign({}, item, {
					name: self.getItemDisplayName(item),
					total: self.price(self.getTotalItem(item, false)),
				})

				self.dynamic_fields.forEach(function (prop) {
					if (dedicated_keys[prop.key] || self.isImageProp(prop)) {
						return
					}
					computed_item[prop.key] = self.propertyText(item, prop)
				})

				return computed_item
			})
		},
	},
	methods: {
		/**
		 * Nombre de slot dinamico de b-table para una columna de imagen configurable.
		 *
		 * @param {string} key
		 * @returns {string}
		 */
		cell_slot_name(key) {
			return 'cell(' + key + ')'
		},
		/**
		 * Indica si el ítem permite editar el nombre en el remito: la empresa tiene que tener la
		 * extensión Y el usuario tiene que tener el permiso.
		 *
		 * Son dos capas distintas y por eso no se puede sacar ninguna de las dos: la extensión es
		 * POR EMPRESA (qué comercios contrataron la funcionalidad, la asigna Lucas a mano desde el
		 * admin) y el permiso es POR USUARIO (quién adentro de ese comercio la puede usar).
		 * La extensión va primero para que corte antes.
		 *
		 * @param {Object} item
		 * @return {boolean}
		 */
		can_edit_item_name(item) {
			// !! porque hasExtencion() devuelve undefined si el usuario no está autenticado.
			return !!this.hasExtencion('personalizar_nombre_en_vender')
				&& this.can('article.vender.change_name')
		},
		/**
		 * Placeholder del input de nombre: nombre por defecto del artículo en catálogo.
		 *
		 * @param {Object} item
		 * @return {string}
		 */
		get_item_name_placeholder(item) {
			return item.name || 'Personalizado'
		},
		se_creo_en_vender(item) {
			if (!this.owner.listas_de_precio && !item.final_price) {
				return true 
			}
			return false
		},
		peretir_articulo(article) {
			let item = {
				...article,
				article_variant_id: 0,
				amount: article.amount,
				is_article: true,
			}
			this.$store.commit('vender/setItem', item)
			this.add_item_vender()
		},
		callSetTotal(from_amount_input = false, item = null) {

			if (from_amount_input) {
				
				let check_stock = this.check_stock_disponible(item)

				if (!check_stock) {
					item.amount = 0
				}

				if (
					item
					&& item.is_article
				) {

					/*
						🔴 LA OFERTA POR CANTIDAD CORRE SIN EXTENSION, A PROPOSITO (mision
						oferta-por-cantidad-en-el-renglon, 4/10/2026). Este input es el tercero de los
						tres caminos que cambian la cantidad de un renglon (los otros dos, el alta y el
						re-escaneo, nunca la pidieron) y era el unico con gate: la extension
						`article_price_range`, en un else-if que ni con ella entraba si la cuenta tambien
						tenia `lista_de_precios_por_rango_de_cantidad_vendida`. Llevar el renglon a la
						cantidad de un tramo no aplicaba la oferta y bajarlo no la sacaba. NO VOLVER A
						PONERLE UN hasExtencion: el precio que escribio el vendedor ya esta protegido
						adentro de check_price_range (precio_escrito_a_mano), que es lo que hacia
						peligroso correrla en cada tecla.

						check_price_type_ranges SI sigue detras de su extension: es el gate vivo de OTRA
						funcionalidad, y sin ella podria pisar una lista elegida a mano en el renglon
						(PriceType.vue). Va primero, igual que en add_item_to_sale.
					*/
					let con_listas_por_rango = !!this.hasExtencion('lista_de_precios_por_rango_de_cantidad_vendida')

					let con_ofertas_por_cantidad = !!(
						item.article_price_ranges
						&& item.article_price_ranges.length
					)

					if (con_listas_por_rango) {
						item = this.check_price_type_ranges(item)
					}

					item = this.check_price_range(item)

					/*
						replceItem SOLO si corrio alguno de los dos: cada replceItem agrega una entrada
						"item_updated" al registro de la venta (append_sale_log_entry, store/vender) y
						este input dispara en cada tecla y en cada clic. Una cuenta sin listas por rango,
						con un articulo sin ofertas, no tiene nada que reemplazar: no se le llena el
						registro de la venta.
					*/
					if (
						con_listas_por_rango
						|| con_ofertas_por_cantidad
					) {
						this.$store.commit('vender/replceItem', item)
					}
				}

				/*
					Tercer punto donde cambia la cantidad de algo en el remito: el vendedor edito a
					mano el numero de la columna Cantidad. Este input dispara en cada @keyup, asi
					que la deteccion NO corre aca mismo: se programa, y programar_deteccion_de_combos()
					reinicia la espera en cada tecla. Sin eso, escribir "30" preguntaria al pasar
					por el "3".
				*/
				this.programar_deteccion_de_combos()
			}
			this.setTotal()
		},

		article_variant_options(item) {
			let options = [{
				value: 0,
				text: 'Variante'
			}]

			item.article_variants.forEach(article_variant => {
				if (!article_variant.oculta) {
					options.push({
						value: article_variant.id,
						text: article_variant.variant_description
					})
				}
			})

			return options
		},

		calcular_precio_por_unidades_individuales(item) {
			let precio = Number(item.price_vender)
			let precio_por_unidad = precio / Number(item.unidades_individuales)
			let precio_de_las_unidades_vendidas = precio_por_unidad * Number(item.unidades_individuales_en_esta_venta)
		},
		get_max_discount(item) {
			if (item.cost && this.hasExtencion('maximo_descuento_posible_por_articulo_en_vender')) {
				var costo = Number(item.cost);
				var precioVenta = Number(item.price_vender);

				// Calcula el porcentaje de ganancia actual
				var porcentajeGanancia = ((precioVenta - costo) / costo) * 100;

				// Calcula el nuevo precio de venta después de aplicar el descuento máximo
				var nuevoPrecioVenta = costo;

				// Calcula el porcentaje de descuento máximo
				var porcentajeDescuentoMaximo = 100 - ((nuevoPrecioVenta / precioVenta) * 100);
				
				return '('+porcentajeDescuentoMaximo.toFixed(2)+')'
			}
			return ''
		},
		/**
		 * Enter en el input "Personalizado" (extension varios_precios): el precio tipeado pasa a ser
		 * una fila mas del renglon.
		 *
		 * La fila y el recalculo los hace agregar_otro_precio() (mixins/vender/varios_precios.js),
		 * que es lo mismo que pasaba aca: fila adelante, recalculo del renglon, replceItem y
		 * setTotal(). Despues el foco de este componente y recien ahi se vacia el input, en el mismo
		 * orden de siempre. Lo unico distinto es el id de la fila (ver siguiente_id_de_otro_precio).
		 *
		 * Funciona con la extension `varios_precios` O si el renglon YA tiene varios precios (mision
		 * balanzas-configurables, 3/10/2026). Con "Por balanza" un renglon que recibio tickets queda
		 * en modo varios precios aunque la cuenta no tenga la extension, y su total pasa a ser solo
		 * la suma de las filas (getTotalItem suma calculated_price_vender): sin esto, tipear un
		 * precio y apretar Enter en ese renglon no hacia nada, y el precio tampoco sumaba. Sin la
		 * extension y sin varios precios, todo igual que antes: el Enter no hace nada.
		 *
		 * @param {Object} item Renglon del remito.
		 * @param {Boolean} [hacer_caso=false] Lo pasa en true el @keyup.enter del input.
		 * @returns {void}
		 */
		add_varios_precios(item, hacer_caso = false) {
			if (
				hacer_caso
				&& (
					this.hasExtencion('varios_precios')
					|| tiene_varios_precios(item)
				)
			) {

				this.agregar_otro_precio(item, item.price_vender_personalizado)

				// Hago foco en bar_code o en price-personalizado
				this.foco_despues_de_varios_precios(item)

				item.price_vender_personalizado = ''
			}
		},
		enter_amount(item) {
			this.calculate_price_vender(item)
		},
		/**
		 * Recalcula el renglon con varios precios (Enter en el precio o en la cantidad de una fila,
		 * o despues de borrar una fila) y devuelve el foco como siempre. La cuenta vive en
		 * recalcular_varios_precios() (mixins/vender/varios_precios.js).
		 *
		 * @param {Object} item Renglon del remito con `varios_precios`.
		 * @returns {void}
		 */
		calculate_price_vender(item) {

			this.recalcular_varios_precios(item)

			this.foco_despues_de_varios_precios(item)
		},
		/**
		 * El foco despues de tocar los varios precios de un renglon: con el articulo marcado para
		 * personalizar el precio en VENDER vuelve a la primera entrada de articulos (para seguir
		 * cargando); si no, al input "Personalizado" del renglon, para tipear el proximo precio.
		 *
		 * Es exactamente el foco que tenia calculate_price_vender() antes de la mision
		 * balanzas-configurables; se separo porque el ticket de balanza reusa el calculo pero NO
		 * este foco (siempre vuelve al codigo de barras para el proximo ticket).
		 *
		 * @param {Object} item Renglon del remito.
		 * @returns {void}
		 */
		foco_despues_de_varios_precios(item) {

			if (item.personalizar_price_en_vender) {

				/*
					Era document.getElementById('article-bar-code').focus() sin guarda: tiraba un
					TypeError con el codigo de barras fuera de la pantalla (extension
					no_usar_codigos_de_barra) y, con los diseños de Vender, enfocaba un input
					escondido si el diseño lo saco. Con el codigo de barras a la vista es el mismo foco.
				*/
				enfocar_primera_entrada_de_articulos()

			} else {

				setTimeout(() => {
					document.getElementById('price-vender-'+item.id).focus()
				}, 300)
				
			}
		},
		remove_otro_precio(item, otro_precio) {
			let index = item.varios_precios.findIndex(_otro_precio => {
				return _otro_precio.id == otro_precio.id 
			})

			item.varios_precios.splice(index, 1)
			this.$store.commit('vender/replceItem', item)
			this.calculate_price_vender(item) 
		},
		checked_amount_input_class(item) {

			if (this.previus_sale.checked && (this.es_0(item) || (!this.es_null(item) && !this.es_string_vacio(item) && !this.es_undefined(item)))) {
				return 'input-checked-amount-danger'
			}
		},
		es_0(item) {
			return typeof item.checked_amount == 'number' && item.checked_amount == 0
		},
		es_null(item) {
			return item.checked_amount === null
		},
		es_string_vacio(item) {
			return typeof item.checked_amount == 'string' && item.checked_amount == ''
		},
		es_undefined(item) {
			return typeof item.checked_amount == 'undefined'
		},
		setCheckedItems(item) {
			this.check_checked_item_max_amount(item)
		},
		setReturnedItems(item) {
			this.checkReturnedItemMaxAmount(item)
			this.setTotal()
			this.addReturnedItem(item)
			this.setNotaCreditoDescription()
		},
		check_checked_item_max_amount(item) {
			if (item.checked_amount >= item.amount) {
				this.$toast.error('Solo indique la cantidad de unidades checkeadas, si es menor a la cantidad original')
				item.checked_amount = 0
			} 
		},
		checkReturnedItemMaxAmount(item) {
			if (item.returned_amount > item.amount) {
				this.$toast.error('No se pueden devolver mas unidades de las que se compraron')
				item.returned_amount = item.amount
			} else {
				item.return_to_stock = item.returned_amount
			}
		},
		addReturnedItem(_item) {
			let item = {
				..._item,
			}

			if (item.is_article) {
				let previus_returned_article = this.previus_returned_articles.find(article => {
					return article.id == item.id
				})

				if (typeof previus_returned_article != 'undefined') {
					item.returned_amount -= previus_returned_article.pivot.returned_amount
				}
			} else if (item.is_service) {
				let previus_returned_item = this.previus_returned_services.find(service => {
					return service.id == item.id
				})

				if (typeof previus_returned_item != 'undefined') {
					item.returned_amount -= previus_returned_item.pivot.returned_amount
				}
			}

			this.$store.commit('vender/addReturnedItem', item)
		},
		setNotaCreditoDescription() {
			this.nota_credito_description = ''
			this.returned_items.forEach(item => {
				if (this.nota_credito_description == '') {
					this.nota_credito_description = 'Devolucion de: '+item.returned_amount+' '+item.name 
				} else {
					this.nota_credito_description += ', '+item.returned_amount+' '+item.name 
				}
			})
		},
		// setTotal() {
		// 	this.$store.commit('vender/setTotal')
		// },
		updatePrice(article) {
			this.$store.commit('vender/setUpdatePrice', article)
			this.$bvModal.show('update-price')
		},
		changeToTotal(article) {
			document.getElementById(`total-${article.id}`).focus()
		},
		up(item) {
			item.amount++
			this.$store.commit('vender/updateItem', item)
			this.setTotal()
			// this.$store.commit('vender/setTotal')
		},
		down(item) {
			if (item.amount > 1) {
				item.amount--
				this.$store.commit('vender/updateItem', item)
				this.setTotal()
				// this.$store.commit('vender/setTotal')
			} else {
				// toastr.error('No se pueden restar mas unidades')
				this.removeItem(article)
			}
		},
		removeItem(article) {

			if (
				!this.is_admin
				&& this.can('vender.prohibir_eliminar_articulos_de_venta')
			) {

				const claveIngresada = prompt("Ingrese la clave para eliminar el producto:");

				if (claveIngresada === null) {
					return
				}

				if (claveIngresada === this.owner.clave_eliminar_article) {
					this.eliminar_item(article)
				} else {
					this.$toast.error('Clave incorrecta')
					return  
				}

			} else {
				this.eliminar_item(article)
			}
		},
		eliminar_item(article) {
			this.$store.commit('vender/removeItem', article)
			this.setTotal()
			/* Mismo motivo que en calculate_price_vender: la primera entrada a la vista, no el codigo de barras a ciegas */
			enfocar_primera_entrada_de_articulos()
		},
		calculateTotalFromAmount(article) {
			article.calculate_from_total = false
			this.calculateTotal()
		},
		calculateTotalFromTotal(article) {
			article.calculate_from_total = true
			this.calculateTotal()
		},
		calculateTotal() {
			this.$emit('calculateTotal')
		},
		
	},
}
</script>
<style lang="sass">
@import '@/sass/_custom'

.input-discount
	width: 130px !important

.unidades-individuales
	width: 180px !important

.td-price 
	position: relative
	font-weight: bold		


.ticket-price 
	position: absolute
	font-size: 30px
	color: #E23535
	top: -5px
	left: 0px


.btn-options
	margin-right: 5px
	&:last-child
		margin-right: 0
	@media screen and (max-width: 576px)
		margin-bottom: 5px
		&:last-child
			margin-right: 0

.input-price
	width: 150px

.input-name
	width: 200px

	.cont-input-price
		display: flex 
		flex-direction: column 

		.varios-precios
			display: flex 
			flex-direction: column

			.otro-precio
				display: flex 
				flex-direction: row
				justify-content: space-between 
				margin-top: 10px

				input 
					width: 150px

				.input-amount					
						margin: 0 10px
						width: 90px




.input-checked-amount
	width: 125px
	.prepend
		width: 40px
		background: var(--bg-section, #e9ecef)
		display: flex 
		align-items: center 
		justify-content: center
		border: 1px solid var(--color-border, #ced4da)
		border-radius: .25rem 0 0 .25rem

.input-checked-amount-danger
	border: 4px solid darken($red, 10)
	border-radius: .25rem

.options 
	width: 140px

/* Estado vacío del remito: fondo blanco para diferenciarlo de los headers de etapa (#f8f9fa) */
.remito-empty-state
	display: flex
	flex-direction: column
	align-items: center
	justify-content: center
	gap: 6px
	padding: 2.5rem 1.5rem
	border: 1px dashed var(--color-border, #ced4da)
	border-radius: 8px
	background: var(--bg-card, #fff)
	text-align: center

.remito-empty-state__icon
	display: flex
	align-items: center
	justify-content: center
	width: 48px
	height: 48px
	margin-bottom: 4px
	border-radius: 50%
	background: var(--bg-section, #f8f9fa)
	color: var(--color-text-secondary, #6c757d)
	font-size: 1.35rem

.remito-empty-state__title
	margin: 0
	font-size: 0.95rem
	font-weight: 600
	color: var(--color-text-primary, #212529)

.remito-empty-state__hint
	margin: 0
	font-size: 0.82rem
	color: var(--color-text-secondary, #6c757d)
</style>