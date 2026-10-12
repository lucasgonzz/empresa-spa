<template>
	<b-button
	block
	@click="buscar"
	:disabled="disabled"
	variant="primary">
		Buscar
	</b-button>
</template>
<script>
import { fecha_moneda_params } from '@/store/reportes/index'

export default {
	computed: {
		/* Modo temporal del selector de fechas de reportes */
		rango_temporal() {
			return this.$store.state.reportes.rango_temporal
		},

		/* Rango inválido cuando la fecha de inicio es posterior a la de fin */
		fecha_invalida() {
			if (!this.mes_inicio || !this.mes_fin) {
				return false
			}
			return this.mes_inicio > this.mes_fin
		},

		/*
			En «Rango de fechas» solo se busca con el rango completo y válido. En «Hoy» siempre se puede
			buscar: va hoy–hoy (hasta el 10/10/2026 quedaba deshabilitado y la solapa no buscaba nada).
		*/
		disabled() {
			if (this.rango_temporal == 'rango-de-fechas') {
				return !this.mes_inicio || !this.mes_fin || this.fecha_invalida
			}
			return false
		},
		client_id() {
			return this.$store.state.reportes.article_purchase.client_id
		},
		provider_id() {
			return this.$store.state.reportes.article_purchase.provider_id
		},
		category_id() {
			return this.$store.state.reportes.article_purchase.category_id
		},
		address_id() {
			return this.$store.state.reportes.article_purchase.address_id
		},
		cantidad_resultados() {
			return this.$store.state.reportes.article_purchase.cantidad_resultados
		},
		orden() {
			return this.$store.state.reportes.article_purchase.orden
		},
		sale_channel_id() {
			return this.$store.state.reportes.article_purchase.sale_channel_id
		},
		mes_inicio() {
			return this.$store.state.reportes.mes_inicio
		},
		mes_fin() {
			return this.$store.state.reportes.mes_fin
		},
	},
	methods: {
		/**
		 * Dispara la búsqueda de artículos vendidos según filtros y rango de fechas del store.
		 */
		buscar() {
			if (this.disabled) {
				return
			}

			this.$store.commit('auth/setMessage', 'Buscando')
			this.$store.commit('auth/setLoading', true)
				this.$store.commit('reportes/article_purchase/set_loading', true)

			/*
				Mismo criterio de fechas que el resto de Reportes: en «Hoy» desde y hasta son hoy, en
				«Rango de fechas» las elegidas. Viajan con las claves de siempre (mes_inicio/mes_fin), asi
				que una API vieja las lee igual.
			*/
			let fechas = fecha_moneda_params(this.$store.state.reportes, false)
			let rango_buscado = this.rango_temporal

			this.$api.post('article-purchase', {
				client_id: this.client_id,
				provider_id: this.provider_id,
				category_id: this.category_id,
				address_id: this.address_id,
				cantidad_resultados: this.cantidad_resultados,
				sale_channel_id: this.sale_channel_id,
				orden: this.orden,
				mes_inicio: fechas.desde,
				mes_fin: fechas.hasta,
			})
			.then(res => {
				// Si mientras volvia la respuesta se cambio de «Hoy» a «Rango de fechas» (o al reves),
				// articulos/Index.vue ya vacio la pantalla: estos numeros son del otro modo y no se pintan.
				if (this.$store.state.reportes.rango_temporal != rango_buscado) {
					this.$store.commit('auth/setLoading', false)
					return
				}
				this.$store.commit('reportes/article_purchase/set_articles', res.data.models)
				this.$store.commit('reportes/article_purchase/set_categories', res.data.categories)
				this.$store.commit('reportes/article_purchase/set_providers', res.data.providers)
				// Totales de todo el periodo. Una API vieja no los manda: queda null y
				// totales/Index.vue vuelve a sumar la lista, como antes.
				this.$store.commit('reportes/article_purchase/set_totales', res.data.totales || null)
				this.$store.commit('reportes/article_purchase/set_loading', true)
				this.$store.commit('auth/setLoading', false)
			})
			.catch(() => {
				this.$toast.error('Error al buscar')
				this.$store.commit('reportes/article_purchase/set_loading', true)
				this.$store.commit('auth/setLoading', false)
			})
		}
	}
}
</script>