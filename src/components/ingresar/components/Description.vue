<template>
	<b-form-row
	v-if="has_online">
		<b-col>
			<p
			class="c-p"
			@click="show ? show = false : show = true">
				Descripciones
				<icon-show
				:show="show"></icon-show>
			</p>
			<div
			v-show="show">
				<b-button
				class="m-b-15"
				@click="copyToArticle"
				variant="primary"
				size="sm"
				v-if="selected_descriptions.length && this.current_page == 'Listado'">
					{{ copy_descriptions_text }}
				</b-button>
				<select-article
				v-if="copy_descriptions"
				:selected_article="selected_article"
				text="Busque un articulo para copiar estas descripciones"
				@articleSelected="articleSelected"></select-article>
				<b-button
				class="m-b-15"
				size="sm"
				variant="primary"
				@click="sendCopyToArticle"
				v-if="selected_article">
					<btn-loader
					text="Copiar descripciones"
					:loader="loading"></btn-loader>
				</b-button>
				<div class="description"
				v-for="(description, index) in article.descriptions"
				:key="index">
					<div 
					v-if="current_page == 'Listado'"
					class="cont-checkbox">
						<b-form-checkbox
						class="c-p"
						:id="'checkbox-description-'+description.id"
						v-model="selected_descriptions"
						name="checkbox-1"
						:value="description.id">
						</b-form-checkbox>
					</div>
					<b-form-group
					class="m-b-15"
					label="Descripcion">
						<b-form-input
						class="m-b-15"
						v-model="description.title"
						placeholder="Titulo">
						</b-form-input>
						<b-form-textarea
						v-model="description.content"
						placeholder="Descripcion para el articulo">
						</b-form-textarea>
					</b-form-group>
				</div>
				<b-form-group
				v-if="check()"
				class="j-start m-b-15">
					<b-button
					size="sm"
					variant="primary"
					@click="addDescription">
						<i class="icon-plus"></i>
						Agregar descripcion
					</b-button>
				</b-form-group>
			</div>
		</b-col>
	</b-form-row>
</template>
<script>
import SelectArticle from '@/components/common/SelectArticle'
import edit_articles from '@/mixins/edit_articles'
import IconShow from '@/components/common/IconShow'
import BtnLoader from '@/common-vue/components/BtnLoader'
export default {
	props: ['article'],
	components: {
		SelectArticle,
		IconShow,
		BtnLoader,
	},
	mixins: [edit_articles],
	data() {
		return {
			show: false,
			selected_descriptions: [],
			copy_descriptions: false,
			selected_article: null,
			loading: false,
		}
	},
	computed: {
		copy_descriptions_text() {
			if (this.copy_descriptions) {
				return 'Cancelar'
			}
			return 'Copiar a otro articulo'
		},
	},
	methods: {
		copyToArticle() {
			this.copy_descriptions ? this.copy_descriptions = false : this.copy_descriptions = true
		},
		articleSelected(article) {
			this.selected_article = article
		},
		sendCopyToArticle() {
			this.loading = true
			this.$api.put('articles/descriptions-copy', {
				descriptions_id: this.selected_descriptions,
				from: this.article, 
				to: this.selected_article
			})
			.then(res => {
				this.loading = false
				this.$store.commit('articles/update', res.data.article)
				this.$toast.success('Descripciones copiadas')
			})
			.catch(err => {
				this.loading = false
				console.log(err)
				this.$toast.error('Error al copiar descripciones')
			})
		},
		addDescription() {
			if (this.check()) {
				this.article.descriptions.push({
					title: '',
					content: '',
				})
			}
		},
		check() {
			return this.article.descriptions[this.article.descriptions.length-1].content && this.article.descriptions[this.article.descriptions.length-1].content.length
		}
	},
}
</script>
<style lang="sass">
.description
	display: flex
	padding: 0
</style>