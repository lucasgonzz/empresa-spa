<template>
	<b-modal
	v-if="usa_props_to_show"
	size="lg"
	modal-class="props-to-show-modal"
	body-class="props-to-show-body"
	footer-class="props-to-show-footer"
	title="Propiedades para mostrar"
	:id="'props-to-show-'+model_name">

		<columns-preferences-config-modal
		:config_rows="config_rows"></columns-preferences-config-modal>

		<template #modal-footer>
			<b-button
			block
			@click="save"
			class="m-t-15"
			variant="primary">
				Listo
			</b-button>
		</template>
	</b-modal>
</template>
<script>
import ColumnsPreferencesConfigModal from './ColumnsPreferencesConfigModal.vue'
import {
	default_column_width_for_property,
	fallback_column_width_px,
} from '@/common-vue/config/column_preference_defaults'
export default {
	components: {
		ColumnsPreferencesConfigModal,
	},
	props: {
		model_name: String,
	},
	data() {
		return {
			config_rows: [],
			loading_preferences: false,
		}
	},
	computed: {
		usa_props_to_show() {
			if (this.$store._mutations[this.model_name+'/set_props_to_show']) {
				return true
			}
			console.warn(`La mutación set_props_to_show no está definida en el store.`);
			return false
		},
		all_properties() {
			let props = require(`@/models/${this.model_name}`).default.properties
			
			props = props.filter(prop => {
				return typeof prop.group_title == 'undefined'
					&& typeof prop.no_mostrar_nunca == 'undefined'
					&& typeof prop.key != 'undefined'
					&& prop.key !== null
					&& prop.key !== ''
			})
			props = this.check_extencions(props)

			props.push({
				key: 'created_at',
				text: 'Creado',
				type: 'date',
				is_date: true,
			})
			props.push({
				key: 'updated_at',
				text: 'Actualizado',
				type: 'date',
				is_date: true,
			})

			return props.filter(prop => prop.type != 'button')
		},
		props_to_show() {
			return this.$store.state[this.model_name].props_to_show
		},
	},
	watch: {
		model_name() {
			if (this.usa_props_to_show) {
				this.init_preferences()
			}
		},
	},
	async created() {
		if (this.usa_props_to_show) {
			await this.init_preferences()
		}
	},
	methods: {
		async save() {
			const rows_to_save = this.config_rows
			.filter(row => typeof row.key != 'undefined' && row.key !== null && row.key !== '')
			.map((row, index) => ({
				key: row.key,
				visible: !!row.visible,
				order: index,
				width: row.width ? Number(row.width) : null,
				wrap_content: !!row.wrap_content,
				fade_when_truncated: !!row.fade_when_truncated,
			}))

			this.apply_rows_to_store(rows_to_save)
			await this.save_preference_in_api(rows_to_save)
			this.$bvModal.hide('props-to-show-' + this.model_name)
		},
		async init_preferences() {
			try {
				localStorage.removeItem('table_column_preference-' + this.model_name)
			} catch (e) {
				// ignore
			}

			const default_rows = this.get_default_rows()
			const store_rows = this.tableColumnPreferenceColumnsFromStore(this.model_name, 'table')
			let api_rows = store_rows && store_rows.length
				? store_rows
				: await this.get_preference_from_api()

			let rows = default_rows
			if (api_rows && api_rows.length) {
				rows = this.normalize_rows(api_rows, default_rows)
			}

			this.config_rows = rows.map(item => ({
				...item,
				width: item.width || fallback_column_width_px(item.key),
				label: item.label || item.key,
			}))
			this.apply_rows_to_store(this.config_rows)
		},
		get_default_rows() {
			return this.all_properties.map((prop, index) => ({
				key: prop.key,
				label: this.getLabel(prop),
				visible: !prop.not_show,
				order: index,
				width: default_column_width_for_property(prop),
				wrap_content: !!prop.table_wrap_content,
				fade_when_truncated: typeof prop.table_fade_when_truncated == 'undefined' ? true : !!prop.table_fade_when_truncated,
			}))
		},
		normalize_rows(rows, default_rows) {
			const defaults_by_key = {}
			default_rows.forEach(item => {
				defaults_by_key[item.key] = item
			})

			let normalized = rows
				.filter(item => defaults_by_key[item.key])
				.sort((a, b) => Number(a.order) - Number(b.order))
				.map((item, index) => ({
					key: item.key,
					label: defaults_by_key[item.key].label,
					visible: !!item.visible,
					order: index,
					width: item.width || defaults_by_key[item.key].width || fallback_column_width_px(item.key),
					wrap_content: !!item.wrap_content,
					fade_when_truncated: typeof item.fade_when_truncated == 'undefined'
						? defaults_by_key[item.key].fade_when_truncated
						: !!item.fade_when_truncated,
				}))

			default_rows.forEach(default_item => {
				const exists = normalized.find(item => item.key == default_item.key)
				if (!exists) {
					normalized.push({
						...default_item,
						order: normalized.length,
					})
				}
			})

			return normalized
		},
		apply_rows_to_store(rows) {
			const properties_by_key = {}
			this.all_properties.forEach(prop => {
				properties_by_key[prop.key] = prop
			})

			const props_to_show = rows
				.filter(row => row.visible)
				.sort((a, b) => Number(a.order) - Number(b.order))
				.map(row => ({
					...properties_by_key[row.key],
					not_show: false,
					table_width: row.width || fallback_column_width_px(row.key),
					table_wrap_content: !!row.wrap_content,
					table_fade_when_truncated: !!row.fade_when_truncated,
				}))

			this.$store.commit(this.model_name + '/set_props_to_show', props_to_show)
		},
		async get_preference_from_api() {
			try {
				this.loading_preferences = true
				const res = await this.$api.get('table-column-preference/' + this.model_name + '/table')
				if (res.data && res.data.model && Array.isArray(res.data.model.columns)) {
					return res.data.model.columns
				}
			} catch (error) {
				// Keep silent to preserve compatibility when endpoint is unavailable.
			} finally {
				this.loading_preferences = false
			}
			return null
		},
		async save_preference_in_api(rows) {
			try {
				await this.$api.put('table-column-preference/' + this.model_name + '/table', {
					columns: rows,
				})
				this.$store.dispatch('table_column_preference/getModels')
			} catch (error) {
				this.$toast.error('No se pudo guardar la configuracion en el servidor')
			}
		},
	}
}
</script>
<style lang="sass">
.props-to-show-modal .modal-content
	max-height: 85vh

.props-to-show-modal .props-to-show-body
	max-height: calc(85vh - 130px)
	overflow-y: auto

.props-to-show-modal .props-to-show-footer
	position: sticky
	bottom: 0
	background: inherit
	z-index: 2
	border-top: 1px solid rgba(0,0,0,.1)
</style>