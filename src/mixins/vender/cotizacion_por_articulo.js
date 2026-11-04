import axios from 'axios'
import { inicializar_cotizacion, aplicar_cotizacion, cotizacion_valida } from '@/utils/cotizacion_por_articulo'

export default {
	data() { return { cotizacion_input_version: 0 } },
	computed: {
		cotizaciones_por_articulo_habilitadas() { return this.$store.state.vender.cotizacion_por_articulo_disponible === true },
		resumen_cotizaciones_articulos() {
			let conteo = { vender: 0, proveedor: 0, manual: 0, historica: 0, sin_cotizacion: 0 }
			this.$store.state.vender.items.forEach(item => {
				if (item.is_article) {
					let filas = item.varios_precios && item.varios_precios.length ? item.varios_precios : [item]
					filas.forEach(fila => conteo[fila.cotizacion_origen || 'sin_cotizacion']++)
				}
			})
			return conteo
		},
	},
	methods: {
		cargar_capacidad_cotizaciones() {
			let self = this
			return axios.get('/api/vender/cotizaciones-articulos').then(function (res) {
				// Sin la extensión `ventas_en_dolares` desde la misión prueba-listas-siempre (3/11/2026): la cotización por artículo es de Vender, para todo negocio.
				self.$store.commit('vender/set_cotizacion_por_articulo_disponible', res.data.supported === true)
				self.$store.state.vender.items.forEach(item => self.iniciar_cotizacion_articulo(item))
				self.setTotal()
			}).catch(function () {
				self.$store.commit('vender/set_cotizacion_por_articulo_disponible', false)
			})
		},
		iniciar_cotizacion_articulo(item) {
			let estado = this.$store.state.vender
			let documento = estado.budget || estado.previus_sales.previus_sale
			inicializar_cotizacion(item, estado, this.owner, documento)
		},
		editar_cotizacion_articulo(item, valor) {
			if (!cotizacion_valida(valor)) {
				this.cotizacion_input_version++
				this.$toast.error('Ingresá una cotización mayor que cero.')
				return
			}
			this.cotizacion_input_version++
			aplicar_cotizacion(item, valor, 'manual', this.$store.state.vender.moneda_id)
			if (item.varios_precios) item.varios_precios.forEach(fila => aplicar_cotizacion(fila, valor, 'manual', this.$store.state.vender.moneda_id))
			this.$store.commit('vender/setItems', this.$store.state.vender.items.slice())
			this.setTotal()
		},
		actualizar_cotizaciones_articulos() {
			let self = this
			let estado = this.$store.state.vender
			if (!cotizacion_valida(estado.valor_dolar)) return this.$toast.error('Ingresá primero la cotización de Vender.')
			this.$bvModal.msgBoxConfirm('Se reemplazarán también las cotizaciones manuales y se recalcularán los importes que requieran conversión. Los precios manuales conservan su moneda de origen.', { title: 'Actualizar cotizaciones de los artículos', okTitle: 'Actualizar', cancelTitle: 'Cancelar' }).then(function (confirmado) {
				if (!confirmado) return
				let ids = estado.items.filter(item => item.is_article).map(item => item.id)
				return axios.get('/api/vender/cotizaciones-articulos', { params: { ids } }).then(function (res) {
					if (!res.data.supported) throw new Error('El sistema todavía no admite cotizaciones por artículo.')
					if (estado.items.some(item => item.is_article && !res.data.articulos[item.id])) throw new Error('No se pudo consultar uno de los artículos. Volvé a cargar la venta.')
					estado.items.forEach(item => {
						if (!item.is_article) return
						let dato = res.data.articulos[item.id]
						if (!dato) throw new Error('No se pudo consultar uno de los artículos. Volvé a cargar la venta.')
						let proveedor = cotizacion_valida(dato.proveedor)
						let valor = proveedor ? dato.proveedor : estado.valor_dolar
						let origen = proveedor ? 'proveedor' : 'vender'
						aplicar_cotizacion(item, valor, origen, estado.moneda_id)
						if (item.varios_precios) item.varios_precios.forEach(fila => aplicar_cotizacion(fila, valor, origen, estado.moneda_id))
					})
					self.$store.commit('vender/setItems', estado.items.slice())
					self.setTotal()
				})
			}).catch(function (error) { self.$toast.error(error.message || 'No se pudieron actualizar las cotizaciones.') })
		},
	},
}
