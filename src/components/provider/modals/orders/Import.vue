<template>
	<div>
		<import
		:props_to_send="props_to_send"
		model_name="provider_order"
		model_name_spanish="articulos"
		:advises="advises"
		:pedir_operacion_a_realizar="false"
		:columns="columns"
		@import-success="handleImportSuccess">
			<b-form-group label="Tipo de importación">
				<b-form-radio-group
				v-model="import_type"
				:options="import_type_options"
				buttons
				button-variant="outline-primary"
				size="sm">
				</b-form-radio-group>
			</b-form-group>
			<b-form-group label="Modo de importación">
				<b-form-radio-group
				v-model="overwrite_articles"
				:options="overwrite_articles_options"
				buttons
				button-variant="outline-primary"
				size="sm">
				</b-form-radio-group>
				<b-form-text class="text-muted">
					{{ overwrite_articles_description }}
				</b-form-text>
			</b-form-group>
		</import>
		<import-diff></import-diff>
	</div>
</template>
<script>
export default {
	components: {
		Import: () => import('@/common-vue/components/import/Index'),
		ImportDiff: () => import('@/components/provider/modals/orders/ImportDiff'),
	},
	data() {
		return {
			import_type: 'pedido',
			import_type_options: [
				{ text: 'Importar pedido', value: 'pedido' },
				{ text: 'Importar recibidos', value: 'recibido' },
			],
			overwrite_articles: false,
		}
	},
	computed: {
		advises() {
			return [
				'Las celdas que esten en blanco en el excel, no actualizaran informacion ya existente de los articulos de la compra.',
				'Para que una celda actualice la informacion, no debe estar vacia.',
				'Si en el excel que va a importar faltan articulos que ya estan cargados en la compra, estos articulos faltantes en el excel no se eliminaran de la compra, es decir, el excel agrega/actualiza informacion de los articulos, pero no sobreescribe/reemplaza lo que ya hay.',
			]
		},
		model() {
			return this.$store.state.provider_order.model
		},
		props_to_send() {
			return {
				provider_order_id: this.model.id,
				import_type: this.import_type,
				overwrite_articles: this.overwrite_articles,
			}
		},
		overwrite_articles_options() {
			return [
				{ text: 'Actualizar lista de artículos', value: false },
				{ text: 'Sobreescribir artículos', value: true },
			]
		},
		overwrite_articles_description() {
			if (this.overwrite_articles) {
				return 'Sobreescribir artículos: reemplaza la lista actual por la del Excel (elimina de la compra los artículos que no estén en el archivo).'
			}
			return 'Actualizar lista de artículos: agrega/actualiza lo que venga en el Excel y conserva en la compra los artículos que no estén en el archivo.'
		},
		columns() {
			if (this.import_type === 'recibido') {
				return [
					{ text: 'Codigo de barras' },
					{ text: 'Codigo de proveedor' },
					{ text: 'Nombre' },
					{ text: 'Cantidad recibida' },
					{ text: 'Costo' },
					{ text: 'Notas' },
				].map((col, i) => ({ ...col, column: i + 1 }))
			}
			return [
				{ text: 'Codigo de barras' },
				{ text: 'Codigo de proveedor' },
				{ text: 'Nombre' },
				{ text: 'Cantidad' },
				{ text: 'Costo' },
				{ text: 'Notas' },
			].map((col, i) => ({ ...col, column: i + 1 }))
		},
	},
	methods: {
		handleImportSuccess(res) {
			this.$store.dispatch('provider_order/getModels')
			if (res.data && res.data.diff) {
				this.$store.commit('provider_order/setImportDiff', res.data.diff)
				this.$bvModal.show('import-diff-provider-order')
			}
		},
	},
}
</script>
