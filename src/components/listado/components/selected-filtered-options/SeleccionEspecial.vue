<template>



	<div



	v-if="owner.online">



		<b-modal



		hide-footer



		title="Link para el cliente"



		id="copy-seleccion-especial-link"



		@shown="on_modal_shown">



			<div class="seleccion-especial-link-modal">



				<p class="seleccion-especial-link-modal__intro">



					Copiá y pasale el siguiente link a tu cliente para que pueda ver la selección de artículos que armaste para él.



				</p>







				<div class="seleccion-especial-link-modal__link-card">



					<div class="seleccion-especial-link-modal__link-text">



						{{ link }}



					</div>







					<b-button



					block



					class="seleccion-especial-link-modal__copy-btn"



					:variant="link_copied ? 'success' : 'primary'"



					@click="copy_link">



						<i :class="link_copied ? 'icon-check' : 'icon-clipboard'"></i>



						<span>{{ link_copied ? '¡Copiado!' : 'Copiar al portapapeles' }}</span>



					</b-button>



				</div>







				<p class="seleccion-especial-link-modal__hint">



					El cliente verá solo los artículos incluidos en esta selección.



				</p>



			</div>



		</b-modal>



		<b-dropdown-divider></b-dropdown-divider>







		<dropdown-section-title



		title="Página Web"



		icon="icon-network"></dropdown-section-title>







		<dropdown-option-item



		icon="icon-share"



		@click="generateLink">



			Seleccion especial para la WEB



		</dropdown-option-item>



	</div>



</template>



<script>



import listado_articles_source from '@/mixins/listado/listado_articles_source'



export default {



	mixins: [listado_articles_source],



	components: {



		DropdownSectionTitle: () => import('@/components/listado/components/selected-filtered-options/DropdownSectionTitle'),



		DropdownOptionItem: () => import('@/components/listado/components/selected-filtered-options/DropdownOptionItem'),



	},



	data() {



		return {



			/** URL pública de la selección especial generada para el cliente. */



			link: '',



			/** Indica feedback visual breve tras copiar el link al portapapeles. */



			link_copied: false,



			/** Referencia al timeout que restaura el estado del botón de copiar. */



			copy_feedback_timeout: null,



		}



	},



	beforeDestroy() {



		if (this.copy_feedback_timeout) {



			clearTimeout(this.copy_feedback_timeout)



		}



	},



	methods: {



		/**



		 * Arma el link de selección especial según el dropdown activo (seleccionados o filtrados).



		 *



		 * @return {void}



		 */



		generateLink() {



			let articles = this.resolve_articles()

			if (!articles || !articles.length) {

				return

			}



			let ids = []

			articles.forEach(function (article) {

				ids.push(article.id)

			})



			this.link = this.owner.online + '/seleccion-especial/' + ids.join('-')



			this.$bvModal.show('copy-seleccion-especial-link')



		},



		/**



		 * Restaura el estado visual del botón de copiar al abrir el modal.



		 *



		 * @return {void}



		 */



		on_modal_shown() {



			this.link_copied = false



			if (this.copy_feedback_timeout) {



				clearTimeout(this.copy_feedback_timeout)



				this.copy_feedback_timeout = null



			}



		},



		/**



		 * Copia el link al portapapeles usando la API moderna o un fallback legacy.



		 *



		 * @return {void}



		 */



		copy_link() {



			const self = this







			if (!this.link) {



				return



			}







			if (navigator.clipboard && navigator.clipboard.writeText) {



				navigator.clipboard.writeText(this.link)



					.then(function() {



						self.on_copy_success()



					})



					.catch(function() {



						self.copy_link_fallback()



					})



				return



			}







			this.copy_link_fallback()



		},



		/**



		 * Fallback de copiado para navegadores sin soporte de `navigator.clipboard`.



		 *



		 * @return {void}



		 */



		copy_link_fallback() {



			const self = this



			const textarea = document.createElement('textarea')







			textarea.value = this.link



			textarea.style.position = 'fixed'



			textarea.style.opacity = '0'



			document.body.appendChild(textarea)



			textarea.select()







			try {



				document.execCommand('copy')



				self.on_copy_success()



			} catch (error) {



				self.$toast.error('No se pudo copiar el link')



			}







			document.body.removeChild(textarea)



		},



		/**



		 * Muestra feedback de éxito y restaura el botón tras unos segundos.



		 *



		 * @return {void}



		 */



		on_copy_success() {



			const self = this







			this.link_copied = true



			this.$toast.success('Link copiado al portapapeles')







			if (this.copy_feedback_timeout) {



				clearTimeout(this.copy_feedback_timeout)



			}







			this.copy_feedback_timeout = setTimeout(function() {



				self.link_copied = false



				self.copy_feedback_timeout = null



			}, 2500)



		},



	}



}



</script>



<style lang="sass">



.seleccion-especial-link-modal



	padding: 2px 0







	&__intro



		margin-bottom: 16px



		font-size: 0.92rem



		line-height: 1.5



		color: #495057







	&__link-card



		display: flex



		flex-direction: column



		gap: 12px



		padding: 14px



		border-radius: 12px



		background: linear-gradient(145deg, #f8f9fb 0%, #f1f3f6 100%)



		border: 1px solid rgba(0, 0, 0, 0.08)



		box-shadow: 0 4px 14px rgba(15, 23, 42, 0.06)







	&__link-text



		padding: 12px 14px



		border-radius: 8px



		background: #fff



		border: 1px dashed rgba(13, 110, 253, 0.35)



		font-family: Consolas, 'Courier New', monospace



		font-size: 0.82rem



		line-height: 1.45



		color: #1f2937



		word-break: break-all







	&__copy-btn



		display: inline-flex



		align-items: center



		justify-content: center



		gap: 8px



		padding: 10px 16px



		font-weight: 600



		border-radius: 8px



		transition: transform 0.15s ease, box-shadow 0.15s ease







		&:hover



			transform: translateY(-1px)



			box-shadow: 0 6px 16px rgba(13, 110, 253, 0.2)







		&:active



			transform: translateY(0)







	&__hint



		margin-top: 14px



		margin-bottom: 0



		font-size: 0.8rem



		line-height: 1.4



		color: #6c757d



</style>

