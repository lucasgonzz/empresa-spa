<template>
	<div v-if="model.id">
		<!-- Barra de acciones del presupuesto, alineada visualmente al header del modal de ventas -->
		<div class="budget-modal-buttons">
			<!-- Grupo: impresion (dropdown) + WhatsApp -->
			<div class="budget-modal-buttons__group budget-modal-buttons__group--print">
				<b-dropdown
				variant="danger"
				left
				size="sm"
				boundary="viewport"
				:popper-opts="dropdown_popper_opts"
				menu-class="budget-print-dropdown-menu">
					<template #button-content>
						<i class="bi bi-printer"></i>
						Imprimir
					</template>
					<b-dropdown-item @click="printWithoutPrices">Sin precios</b-dropdown-item>
					<b-dropdown-item @click="printWithPrices">Con precios</b-dropdown-item>
					<b-dropdown-item @click="printWithImages">Con imagenes</b-dropdown-item>
				</b-dropdown>

				<!-- Reutiliza el boton de WhatsApp de ventas en modo presupuesto: from_budget arma el link a /budget/pdf -->
				<whatsapp-btn
				:sale="model"
				from_budget></whatsapp-btn>
			</div>

			<!-- Separador vertical entre grupos -->
			<span
			class="budget-modal-buttons__divider"
			aria-hidden="true"></span>

			<!-- Grupo: edicion del presupuesto (mismo lugar que 'Actualizar venta' en el modal de ventas) -->
			<div class="budget-modal-buttons__group">
				<btn-actualizar-en-vender></btn-actualizar-en-vender>
			</div>
		</div>
		<hr>
	</div>
</template>
<script>
export default {
	components: {
		WhatsappBtn: () => import('@/common-vue/sale-print-buttons/WhatsappBtn'),
		BtnActualizarEnVender: () => import('@/components/budget/components/BtnActualizarEnVender'),
	},
	data() {
		return {
			// Opciones Popper para que el menu del dropdown no quede recortado dentro del modal scrollable
			dropdown_popper_opts: {
				positionFixed: true,
			},
		}
	},
	computed: {
		// Nombre del modelo del store que maneja este modal
		model_name() {
			return 'budget'
		},
		// Presupuesto actualmente abierto en el modal
		model() {
			return this.$store.state[this.model_name].model
		},
	},
	methods: {
		// Abre el PDF del presupuesto SIN precios
		printWithoutPrices() {
			var link = process.env.VUE_APP_API_URL+'/budget/pdf/'+this.model.id+'/0/0'
			window.open(link)
		},
		// Abre el PDF del presupuesto CON precios
		printWithPrices() {
			var link = process.env.VUE_APP_API_URL+'/budget/pdf/'+this.model.id+'/1/0'
			window.open(link)
		},
		// Abre el PDF del presupuesto CON precios e imagenes
		printWithImages() {
			var link = process.env.VUE_APP_API_URL+'/budget/pdf/'+this.model.id+'/1/1'
			window.open(link)
		},
	}
}
</script>
<style lang="sass">
.budget-modal-buttons
	display: flex
	flex-flow: row nowrap
	align-items: center
	width: 100%
	overflow: visible
	padding: 6px 0

	// Separador vertical entre grupos
	&__divider
		display: inline-block
		width: 1px
		height: 22px
		background: var(--color-border-tertiary, #dee2e6)
		margin: 0 8px
		flex-shrink: 0
		opacity: 0.9

	// Contenedor de cada grupo de la barra
	&__group
		display: inline-flex
		flex: 0 0 auto
		align-items: center
		white-space: nowrap
		gap: 4px

	// Impresion + WhatsApp: crear stacking context propio para que el menu del dropdown quede por encima
	&__group--print
		position: relative
		z-index: 1060
		overflow: visible

	// Botones uniformes dentro de la barra
	::v-deep .btn
		display: inline-flex
		align-items: center
		justify-content: center
		gap: 4px
		white-space: nowrap

	// WhatsApp: anular el margen legacy m-l-10 del componente compartido (el gap ya separa)
	::v-deep .m-l-10
		margin-left: 0 !important

.budget-print-dropdown-menu
	z-index: 3060 !important
	background-color: #fff
</style>
