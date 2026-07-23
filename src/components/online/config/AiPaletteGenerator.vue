<template>
	<div class="ai-palette-generator">
		<hr>

		<h5 class="m-b-5">Paleta automática desde el logo</h5>
		<p class="text-muted m-b-15">
			Generá tres propuestas de colores a partir del logo de tu tienda (o el de tu empresa,
			si todavía no cargaste uno para la tienda).
		</p>

		<!-- Estado inicial: todavia no se genero ninguna paleta -->
		<btn-loader
		v-if="!palettes.length"
		:block="false"
		:loader="loading"
		variant="outline-primary"
		text="Generar paleta desde el logo"
		@clicked="generatePalette"></btn-loader>

		<div v-if="palettes.length">
			<!-- Aclaracion: se uso el logo de la empresa porque la tienda no tiene uno cargado -->
			<p
			v-if="logo_source == 'empresa'"
			class="ai-palette-generator__notice">
				Se usó el logo de tu empresa porque tu tienda todavía no tiene uno cargado.
			</p>

			<!-- Aviso: el logo es monocromo, por eso las propuestas son neutras -->
			<p
			v-if="logo_is_monochrome"
			class="ai-palette-generator__notice">
				Tu logo es blanco y negro (o de un solo color), así que las propuestas son paletas
				neutras en vez de intentar inventar un color de marca que el logo no tiene.
			</p>

			<b-row>
				<b-col
				md="4"
				class="m-b-15"
				v-for="palette in palettes"
				:key="palette.id">
					<div
					class="ai-palette-generator__card"
					:class="{ 'ai-palette-generator__card--applied': applied_palette_id == palette.id }">
						<h6 class="m-b-0">{{ palette.nombre }}</h6>
						<p class="text-muted ai-palette-generator__descripcion">{{ palette.descripcion }}</p>

						<!-- Swatches: los cinco colores de la paleta, con el nombre del campo debajo -->
						<div class="ai-palette-generator__swatches">
							<div
							class="ai-palette-generator__swatch"
							v-for="field in palette_fields"
							:key="field.key">
								<div
								class="ai-palette-generator__swatch-color"
								:style="{ backgroundColor: palette[field.key] }"></div>
								<span class="ai-palette-generator__swatch-label">{{ field.label }}</span>
							</div>
						</div>

						<!-- Vista previa en miniatura: simula la nav y una tarjeta de producto -->
						<div
						class="ai-palette-generator__preview"
						:style="{ backgroundColor: palette.background_color }">
							<div
							class="ai-palette-generator__preview-nav"
							:style="{ backgroundColor: palette.primary_color, color: palette.text_color }">
								Mi Tienda
							</div>
							<div class="ai-palette-generator__preview-product">
								<div class="ai-palette-generator__preview-product-title">Producto</div>
								<div
								class="ai-palette-generator__preview-product-price"
								:style="{ color: palette.secondary_color }">$ 1.000</div>
								<div
								class="ai-palette-generator__preview-product-button"
								:style="{ backgroundColor: palette.secondary_color }">Comprar</div>
							</div>
						</div>

						<!-- Warnings de contraste/legibilidad de esta paleta puntual, si el backend mando alguno -->
						<ul
						v-if="palette.warnings && palette.warnings.length"
						class="ai-palette-generator__warnings">
							<li
							v-for="(warning, index) in palette.warnings"
							:key="index">{{ warning }}</li>
						</ul>

						<b-button
						size="sm"
						block
						:variant="applied_palette_id == palette.id ? 'success' : 'outline-primary'"
						@click="applyPalette(palette)">
							{{ applied_palette_id == palette.id ? 'Aplicada' : 'Aplicar' }}
						</b-button>
					</div>
				</b-col>
			</b-row>

			<!--
				Aviso persistente de fondo oscuro (a diferencia de los warnings de arriba,
				que son informativos por paleta, este queda visible mientras la paleta
				aplicada siga teniendo un fondo oscuro, no es un toast que desaparece solo).
			-->
			<div
			v-if="applied_background_dark_warning"
			class="ai-palette-generator__dark-bg-alert">
				{{ applied_background_dark_warning }}
			</div>

			<btn-loader
			:block="false"
			:loader="loading"
			variant="link"
			text="Generar de nuevo"
			@clicked="generatePalette"></btn-loader>
		</div>
	</div>
</template>
<script>
import BtnLoader from '@/common-vue/components/BtnLoader'

/**
 * Generador de paletas de colores con IA a partir del logo de la tienda (grupo 202).
 *
 * Pega a POST online-configuration/generate-palette (sin body: el backend resuelve el
 * usuario por sesion) y muestra hasta tres propuestas (fiel al logo, sobria, contraste),
 * cada una con sus cinco swatches, una vista previa en miniatura y los warnings de
 * contraste que haya calculado el validador determinista del backend.
 *
 * Al aplicar una paleta se escriben los cinco colores directo en `model` (el
 * online_configuration del formulario), sin guardar: el usuario guarda con el boton
 * normal del formulario, igual que cualquier otro campo. Esto es deliberado para que
 * aplicar sea reversible cerrando el modal sin guardar.
 */
export default {
	name: 'AiPaletteGenerator',
	components: {
		BtnLoader,
	},
	props: {
		// Modelo online_configuration del formulario, donde se escriben los colores al aplicar
		model: {
			type: Object,
			required: true,
		},
	},
	data() {
		return {
			// Indicador de generacion en curso (usado por BtnLoader para el spinner)
			loading: false,
			// Paletas devueltas por el backend (0 a 3), ya validadas por contraste
			palettes: [],
			// De donde salio el logo usado: 'tienda' o 'empresa'
			logo_source: null,
			// Si el logo es monocromo, el backend propone paletas neutras en vez de inventar un color de marca
			logo_is_monochrome: false,
			// Id de la paleta actualmente aplicada al formulario (marca visual de "Aplicada")
			applied_palette_id: null,
			// Texto del warning de fondo oscuro de la paleta aplicada, si corresponde (null = no mostrar el aviso)
			applied_background_dark_warning: null,
			// Definicion de los cinco campos de color, en el orden en que se muestran los swatches
			palette_fields: [
				{ key: 'primary_color', label: 'Primario' },
				{ key: 'secondary_color', label: 'Secundario' },
				{ key: 'text_color', label: 'Texto' },
				{ key: 'hover_text_color', label: 'Texto hover' },
				{ key: 'background_color', label: 'Fondo' },
			],
		}
	},
	methods: {
		/**
		 * Pide al backend que genere las tres propuestas de paleta a partir del logo
		 * de la tienda (o el de la empresa, si la tienda no tiene uno cargado).
		 *
		 * @returns {void}
		 */
		generatePalette() {
			this.loading = true
			this.$store.commit('auth/setMessage', 'Generando paleta desde el logo')
			this.$store.commit('auth/setLoading', true)

			this.$api.post('online-configuration/generate-palette')
			.then(response => {
				this.loading = false
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')

				this.palettes = response.data.palettes || []
				this.logo_source = response.data.logo_source
				this.logo_is_monochrome = !!response.data.logo_is_monochrome

				// Al regenerar, se pierde la marca de "aplicada" (son paletas nuevas)
				this.applied_palette_id = null
				this.applied_background_dark_warning = null
			})
			.catch(err => {
				this.loading = false
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')

				// El backend manda en 422 un mensaje en español listo para mostrar (logo faltante, formato invalido, etc.)
				let error_message = 'No se pudo generar la paleta. Intentá nuevamente.'
				if (err.response && err.response.data && err.response.data.message) {
					error_message = err.response.data.message
				}
				this.$toast.error(error_message)
			})
		},
		/**
		 * Escribe los cinco colores de la paleta elegida directo en el modelo del
		 * formulario, sin guardar. Marca visualmente cual quedo aplicada y, si esa
		 * paleta trae un fondo oscuro, deja visible el aviso persistente correspondiente.
		 *
		 * @param {Object} palette Paleta elegida (con los cinco colores ya validados)
		 * @returns {void}
		 */
		applyPalette(palette) {
			this.$set(this.model, 'primary_color', palette.primary_color)
			this.$set(this.model, 'secondary_color', palette.secondary_color)
			this.$set(this.model, 'text_color', palette.text_color)
			this.$set(this.model, 'hover_text_color', palette.hover_text_color)
			this.$set(this.model, 'background_color', palette.background_color)

			this.applied_palette_id = palette.id

			// El backend agrega el aviso de fondo oscuro como uno de los warnings de la paleta (ver Prompt 02, validacion 6)
			this.applied_background_dark_warning = null
			if (palette.background_is_dark && palette.warnings && palette.warnings.length) {
				let dark_warning = palette.warnings.find(warning => {
					return warning.toLowerCase().indexOf('fondo oscuro') !== -1
				})
				this.applied_background_dark_warning = dark_warning || 'El fondo elegido es oscuro: revisá cómo se ve antes de guardar.'
			}

			this.$toast.success('Paleta aplicada. Acordate de guardar para que se vea en tu tienda.')
		},
	},
}
</script>
<style scoped lang="sass">
.ai-palette-generator
	width: 100%
	&__notice
		font-size: 13px
		color: #6c757d
		margin-bottom: 10px
	&__card
		border: 1px solid #e2e2e2
		border-radius: 12px
		padding: 15px
		height: 100%
		display: flex
		flex-direction: column
		gap: 8px
		&--applied
			border-color: #28a745
			box-shadow: 0 0 0 1px #28a745
	&__descripcion
		font-size: 12px
		margin-bottom: 5px
	&__swatches
		display: flex
		gap: 8px
	&__swatch
		display: flex
		flex-direction: column
		align-items: center
		flex: 1
		&-color
			width: 100%
			height: 24px
			border-radius: 6px
			border: 1px solid rgba(0,0,0,.08)
		&-label
			font-size: 10px
			color: #6c757d
			margin-top: 3px
			text-align: center
	&__preview
		border-radius: 8px
		overflow: hidden
		border: 1px solid rgba(0,0,0,.08)
		height: 120px
		display: flex
		flex-direction: column
		&-nav
			padding: 8px 10px
			font-size: 12px
			font-weight: 600
		&-product
			margin: 10px
			padding: 8px
			background: #fff
			border-radius: 6px
			flex: 1
			display: flex
			flex-direction: column
			justify-content: space-between
			&-title
				font-size: 11px
				color: #212529
				font-weight: 600
			&-price
				font-size: 12px
				font-weight: 700
			&-button
				font-size: 11px
				color: #fff
				text-align: center
				padding: 4px
				border-radius: 4px
	&__warnings
		font-size: 11px
		color: #b8860b
		padding-left: 16px
		margin-bottom: 0
	&__dark-bg-alert
		margin-top: 10px
		padding: 10px 12px
		border-radius: 8px
		background: #fff3cd
		color: #856404
		font-size: 13px
</style>
