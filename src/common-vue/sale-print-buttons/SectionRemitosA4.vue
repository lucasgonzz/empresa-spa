<template>
	<div>
		<b-dropdown-divider></b-dropdown-divider>
		<b-dropdown-text>
			Remitos A4
		</b-dropdown-text>
		<b-dropdown-divider></b-dropdown-divider>

		<b-dropdown-item
		v-for="profile in remitos_a4_profiles"
		:key="'pdf-profile-'+profile.id"
		@click="$emit('print_with_profile', profile.id)"
		class="p-0">
			<div class="sale-print-remito-profile-row">
				<span
				class="sale-print-remito-profile-label"
				role="button"
				tabindex="0"
				@keydown.enter.prevent="$emit('print_with_profile', profile.id)">
					{{ profile.name }}
				</span>
				<b-button
				v-if="is_admin"
				variant="link"
				size="sm"
				class="sale-print-remito-profile-config p-0"
				title="Configurar columnas de este perfil"
				:aria-label="'Configurar columnas: '+profile.name"
				@click.stop="$emit('open_profile_modal', profile.id)">
					<i class="icon-configuration"></i>
				</b-button>
			</div>
		</b-dropdown-item>
	</div>
</template>

<script>
export default {
	props: {
		remitos_a4_profiles: {
			type: Array,
			default() {
				return []
			},
		},
	},
}
</script>
