import selected_filtered_source from '@/common-vue/mixins/selected_filtered_source'

/**
 * Atajo del mixin genérico para acciones masivas del listado de artículos.
 */
export default {
	mixins: [selected_filtered_source],
	computed: {
		resolved_model_name() {
			return 'article'
		},
	},
	methods: {
		/**
		 * Alias semántico para artículos.
		 *
		 * @return {Array|null}
		 */
		resolve_articles() {
			return this.resolve_models()
		},
		/**
		 * Alias semántico para artículos.
		 *
		 * @return {Array}
		 */
		resolve_article_ids() {
			return this.resolve_model_ids()
		},
	},
}
