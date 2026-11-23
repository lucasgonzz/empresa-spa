import computed from '@/mixins/vender/computed'
/*
	Demanda no satisfecha (misión demanda-sin-stock-vender): el punto único que anota en la API los
	pedidos que Vender frena por stock. Se hereda acá para que lo tengan todos los que usan check_stock.
*/
import demanda_sin_stock from '@/mixins/vender/demanda_sin_stock'
import {
	registro_de_articulo,
	MOTIVO_SIN_STOCK,
	MOTIVO_STOCK_INSUFICIENTE,
} from '@/utils/demanda_sin_stock'
export default {
	mixins: [computed, demanda_sin_stock],
	methods: {

		check_stock_mayor_a_cero(item) {

			if (
				!this.guardar_como_presupuesto 
				&& (
					this.hasExtencion('check_article_stock_en_vender')
					|| this.hasExtencion('warn_article_stock_en_vender')
					)
				) {

				if (item.is_article) {

					if (item.stock === null || item.stock > 0) {
						return true 
					}

					if (this.hasExtencion('check_article_stock_en_vender')) {

						this.$toast.error('Articulo sin stock, NO se agrego')

						// Frenó por check_article_stock_en_vender: queda anotado como pedido sin stock.
						this.registrar_frenos_por_stock(
							[registro_de_articulo(item, MOTIVO_SIN_STOCK, null, Number(item.stock), null)],
							{ nombres: [item.name], combo_nombre: null }
						)
						document.getElementById('article-bar-code').value = ''
						return false 
					} else {

						this.$toast.error('Articulo sin stock')
						return true 
					}


				} else if (item.is_combo) {

					let tiene_stock = true 

					let articles_sin_stock = item.articles.filter(article => {

						if (article.stock !== null && article.stock <= 0) {

							tiene_stock = false
							return true 
						}
					})

					articles_sin_stock.forEach(article => {

						this.$toast.error('El articulo '+article.name+' no tiene stock')
					})

					if (this.hasExtencion('check_article_stock_en_vender')) {

						// Frenó el combo: se anota cada componente sin stock, con el id del combo.
						if (!tiene_stock) {

							let registros_del_combo = []
							let nombres_del_combo = []
							articles_sin_stock.forEach(article => {
								registros_del_combo.push(registro_de_articulo(article, MOTIVO_SIN_STOCK, null, Number(article.stock), item.id))
								nombres_del_combo.push(article.name)
							})
							this.registrar_frenos_por_stock(
								registros_del_combo,
								{ nombres: nombres_del_combo, combo_nombre: item.name }
							)
						}
						return tiene_stock
					} else {
						return true
					}

				}
			}
			return true 
		},

		check_stock_disponible(item) {

			let stock_disponible = true

			// Frenos por stock a anotar como demanda no satisfecha y los nombres para el aviso (en el mismo orden).
			let registros_de_frenos = []
			let nombres_de_frenos = []

			console.log('check_stock_disponible, item:')
			console.log(item)
			
			if (
				!this.guardar_como_presupuesto 
				&& (
					this.hasExtencion('check_article_stock_en_vender')
					|| this.hasExtencion('warn_article_stock_en_vender')
				)
			) {

				let cantidad_para_vender = Number(item.amount)

				if (item.is_article) {

					/*
						Misión sucursal-siempre (23/10/2026): esto es DATO y sigue igual con una sola
						sucursal. El stock se valida contra el pivot de la sucursal de Vender, que con
						una sola sucursal (autoseleccionada, D6) es todo el stock del artículo: da lo
						mismo que validar el global. Lo único que cambia es el aviso: con una sola
						sucursal no se la nombra, porque el vendedor no la ve en ningún lado (D1).
					*/
					if (item.addresses.length) {

						let address = item.addresses.find(ad => ad.id == this.$store.state.vender.address_id)

						if (typeof address != 'undefined') {

							let stock = address.pivot.amount
							let donde = this.muestra_sucursales ? 'en ' + address.street : 'en stock'

							if (stock <= 0) {

								stock_disponible = false
								this.$toast.error('No hay stock ' + donde)
								registros_de_frenos.push(registro_de_articulo(item, MOTIVO_SIN_STOCK, cantidad_para_vender, Number(stock), null))
								nombres_de_frenos.push(item.name)
							} else if (stock < cantidad_para_vender) {

								stock_disponible = false
								this.$toast.error('Solo hay '+this.numero_es(stock)+' '+donde)
								registros_de_frenos.push(registro_de_articulo(item, MOTIVO_STOCK_INSUFICIENTE, cantidad_para_vender, Number(stock), null))
								nombres_de_frenos.push(item.name)

							}
						}

					} else if (item.stock && Number(item.stock) < cantidad_para_vender) {
						
						stock_disponible = false 
						
						this.$toast.error('Solo hay '+this.numero_es(item.stock)+' en stock')
						registros_de_frenos.push(registro_de_articulo(item, MOTIVO_STOCK_INSUFICIENTE, cantidad_para_vender, Number(item.stock), null))
						nombres_de_frenos.push(item.name)
					}

				} else if (item.is_combo) {

					let articles_sin_stock = item.articles.filter(article => {

						if (article.stock && Number(article.stock) < cantidad_para_vender) {

							stock_disponible = false
							return true 
						}
					})

					articles_sin_stock.forEach(article => {

						this.$toast.error(article.name+' solo tiene '+this.numero_es(article.stock)+' en stock')
						registros_de_frenos.push(registro_de_articulo(article, MOTIVO_STOCK_INSUFICIENTE, cantidad_para_vender, Number(article.stock), item.id))
						nombres_de_frenos.push(article.name)
					})

				}
			}
			if (this.hasExtencion('check_article_stock_en_vender')) {

				// Sólo se anota cuando de verdad frena (con warn_… se devuelve true y no se anota nada).
				if (!stock_disponible) {
					this.registrar_frenos_por_stock(
						registros_de_frenos,
						{ nombres: nombres_de_frenos, combo_nombre: item.is_combo ? item.name : null }
					)
				}
				return stock_disponible
			}
			return true
		},
	}
}