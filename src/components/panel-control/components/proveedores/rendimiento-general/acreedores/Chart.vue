<script>
import { Bar } from 'vue-chartjs'
import moment from 'moment'
import article_performance from '@/mixins/article_performance'
export default {
	mixins: [article_performance],
	extends: Bar,
	computed: { 
		current_page() {  
			return this.$store.state.panel_control.provider.acreedores.current_page
		},
		order_by() {  
			return this.$store.state.panel_control.provider.acreedores.order_by
		},
	},
	mounted() {
		this.setChart() 
	},
	watch: {
		current_page() {
			this.setChart()
		},
		order_by() {
			this.setChart()
		},
	},
	data() {
		return {
			per_page: 10,
		}
	},
	methods: {
		setChart() {
			let labels = []
			let data = []

			let providers = this._providers

			console.log('providers')
			console.log(providers)

			let inicio = this.current_page * this.per_page
			let fin = inicio + this.per_page
			if (fin > providers.length) {
				fin = providers.length
			}


			// Se ordena por el saldo vivo en pesos (ver saldo_en_pesos), no por la columna vieja `saldo`.
			if (this.order_by == 'mayor-a-menor') {	
				providers = providers.sort((a, b) => this.saldo_en_pesos(b) - this.saldo_en_pesos(a))
			} else {
				providers = providers.sort((a, b) => this.saldo_en_pesos(a) - this.saldo_en_pesos(b))
			}
			console.log(providers)

			providers = providers.slice(inicio, fin)
			console.log(providers)

			providers.forEach(model => {
				labels.push(model.name)
				data.push(this.saldo_en_pesos(model))
			})		

			let that = this
			this.renderChart({
				labels: labels,
				datasets: [
					{
						// El grafico es en pesos: con la extension de dolares el rotulo lo aclara, para que no se lea como el total de la deuda.
						label: this.hasExtencion('ventas_en_dolares') ? 'Saldo en pesos' : 'Saldo',
						backgroundColor: '#007bff',
						data: data,
					},
				],
			}, {
				maintainAspectRatio: false,
				onClick: function (event, elements, chart) {
					let provider = providers[elements[0]._index]
					that.setSelectedProvider(provider)
				},
				tooltips: {
					callbacks: {
						label: function(tooltipItem, data) {
							return that.price(tooltipItem.yLabel)
						}
					}
				}
			})
		},
		/**
		 * Saldo del proveedor en pesos, listo para ordenar y graficar.
		 *
		 * 🔴 Lee `saldo_pesos` y no `saldo`: esa columna es de antes de las cuentas por moneda y ningun
		 * movimiento la mantiene al dia (`CurrentAcountHelper::set_model_saldo()` solo sincroniza `saldo_pesos`
		 * y `saldo_dolares`), asi que el grafico mostraba un valor congelado, o vacio en un proveedor nuevo.
		 * `saldo_pesos` es el mismo dato que muestra la lista de Proveedores.
		 *
		 * Los decimales llegan como string ("1234.50") y como `null` hasta el primer movimiento de la cuenta:
		 * `Number() || 0` los vuelve un numero, para que el orden y la altura de la barra no dependan del tipo.
		 *
		 * Los dolares (`saldo_dolares`) no se grafican aca: son otra moneda y no se suman ni comparten eje
		 * con los pesos.
		 *
		 * @param {Object} provider Proveedor del catalogo (`provider/getModels`).
		 * @returns {Number} Saldo en pesos; 0 si no hay dato.
		 */
		saldo_en_pesos(provider) {
			return Number(provider.saldo_pesos) || 0
		},
		setSelectedProvider(provider) {
			this.$router.push({params: {sub_view: 'rendimiento-por-proveedor'}})
			this.setProviderArticles(provider)
		}
	},
}
</script>