<template>
	<div>
		<div
		v-if="afip_a4_print_options.length">
			
			<b-dropdown-divider></b-dropdown-divider>
			<b-dropdown-text>
				Facturas A4
			</b-dropdown-text>
			<b-dropdown-divider></b-dropdown-divider>

			<b-dropdown-item
			v-for="option in afip_a4_print_options"
			:key="'afip-a4-'+option.afip_ticket_id+'-'+option.profile.id"
			@click="$emit('factura_pdf_with_profile', option.afip_ticket_id, option.profile.id)"
			class="p-0">
				<div class="sale-print-remito-profile-row">
					<span
					class="sale-print-remito-profile-label"
					role="button"
					tabindex="0"
					@keydown.enter.prevent="$emit('factura_pdf_with_profile', option.afip_ticket_id, option.profile.id)">
						{{ option.profile.name }} N°{{ option.cbte_numero }}
					</span>
					<b-button
					v-if="is_admin"
					variant="link"
					size="sm"
					class="sale-print-remito-profile-config p-0"
					title="Configurar columnas de este perfil"
					:aria-label="'Configurar columnas: '+option.profile.name"
					@click.stop="$emit('open_profile_modal', option.profile.id)">
						<i class="icon-configuration"></i>
					</b-button>
				</div>
			</b-dropdown-item>
		</div>
	</div>
</template>

<script>
export default {
	props: {
		afip_a4_print_options: {
			type: Array,
			default() {
				return []
			},
		},
	},
}
</script>
