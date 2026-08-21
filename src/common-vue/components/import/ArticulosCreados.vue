<template>
<b-modal
title="Articulos"
hide-footer
size="lg"
id="articulos-creados">
	
	<b-table
	v-if="articles.length"
	class="s-2 b-r-1 animate__animated animate__fadeIn"
	head-variant="dark"
	responsive
	striped
	id="stock-movement-table"
	:fields="fields"
	:items="items">

		<template #cell(updated_props)="data">
	      <div v-html="data.item.updated_props"></div>
	    </template>

	</b-table>

</b-modal>
</template>
<script>
export default {
	props: {
		articles: Array,
	},
	computed: {
		fields() {
			return [
				{
					label: 'Numero',
					key: 'num',
				},
				{
					label: 'Codigo Barras',
					key: 'bar_code',
				},
				{
					label: 'Nombre',
					key: 'name',
				},
				{
					label: 'Propiedades actualizadas',
					key: 'updated_props',
				},
			]
		},
		items() {
			let items = []
			let concepto = null 
			this.articles.forEach(article => {
				items.push({
					num: article.id,
					bar_code: article.bar_code,
					name: article.name,
					updated_props: this.formatUpdatedProps(article),
				})
			})
			return items 
		},
		addresses() {
			return this.$store.state.address.models
		},
	},
	methods: {
		/**
		 * Formatea las props actualizadas mostrando:
		 * "nombrePropiedad: valorViejo → valorNuevo"
		 */
		formatUpdatedProps(article) {
		  if (!article.pivot || !article.pivot.updated_props) {
		    return '—'
		  }

		  let updatedProps
		  try {
		    updatedProps = JSON.parse(article.pivot.updated_props)
		  } catch (e) {
		    console.error('Error parseando updated_props', e)
		    return 'Error'
		  }

		  let lines = []

		  Object.keys(updatedProps).forEach(key => {
		    if (key.startsWith('__diff__')) return

		    const value = updatedProps[key]
		    const diff = updatedProps[`__diff__${key}`]

		    // Caso 1: dif directo (ej: cost)
		    if (diff && typeof diff === 'object') {
		      lines.push(`<b>${this.prettyName(key)}:</b> ${this.formatearNumero(diff.old)} → <span class="text-success">${this.formatearNumero(diff.new)}</span>`)
		      return
		    }

		    // Caso 2: stock global
		    // Desde el prompt 04 (grupo 229): d.new pasó a ser el stock RESULTANTE
		    // (no el delta). formatStockDiff() arma "viejo → resultante (delta)"
		    // para que se lea como lo que pasó de verdad (ej: "2 → 1 (-1)"), en vez
		    // de mostrar el delta como si fuera el valor final.
		    if (value && typeof value === 'object' && value.__diff__stock) {
		      const d = value.__diff__stock
		      lines.push(`<b>${this.prettyName(key)}:</b> ${this.formatStockDiff(d)}`)
		      return
		    }

		    // Caso 3: stock por dirección
			if (key === 'stock_addresses' && Array.isArray(value)) {
			  value.forEach(addr => {
			    const label = addr.address_name || `${this.addresses.find(add => add.id == addr.address_id).street}`

			    const subLines = []

			    // Buscar los distintos diffs que pueden existir
			    const diffAmount = addr.__diff__amount
			    const diffMin = addr.__diff__min
			    const diffMax = addr.__diff__max

			    if (diffAmount) {
			      subLines.push(`Stock: ${this.formatearNumero(diffAmount.old)} → <span class="text-success">${this.formatearNumero(diffAmount.new)}</span>`)
			    }
			    if (diffMin) {
			      subLines.push(`Mínimo: ${this.formatearNumero(diffMin.old)} → <span class="text-success">${this.formatearNumero(diffMin.new)}</span>`)
			    }
			    if (diffMax) {
			      subLines.push(`Máximo: ${this.formatearNumero(diffMax.old)} → <span class="text-success">${this.formatearNumero(diffMax.new)}</span>`)
			    }

			    // Si hay algo para mostrar, agregamos el bloque HTML
			    if (subLines.length) {
			      lines.push(
			        `<b>${label}:</b><ul class="mb-0">${subLines.map(s => `<li>${s}</li>`).join('')}</ul>`
			      )
			    }
			  })
			  return
			}

		    // ✅ Caso 4: price_types_data
		    if (key === 'price_types_data' && Array.isArray(value)) {
		      value.forEach(pt => {
		        const id = pt.id ?? '(sin id)'
		        lines.push(`<b>Lista de precios ${id}:</b>`)

		        // Recorremos cada posible diff dentro de este price type
		        const diffs = Object.keys(pt)
		          .filter(k => k.startsWith('__diff__'))
		          .map(k => {
		            const field = k.replace('__diff__', '')
		            const diff = pt[k]
		            const label = this.prettyPriceField(field)
		            return `&nbsp;&nbsp;${label}: ${this.formatearNumero(diff.old) ?? '—'} → <span class="text-success">${this.formatearNumero(diff.new) ?? '(S/A)'}</span>`
		          })

		        if (diffs.length) {
		          lines.push(`<ul class="mb-0">${diffs.map(d => `<li>${d}</li>`).join('')}</ul>`)
		        }
		      })
		      return
		    }

		    // Caso 5: valor plano (por compatibilidad)
		    if (typeof value !== 'object') {
		      lines.push(`<b>${this.prettyName(key)}:</b> ${this.formatearNumero(value)}`)
		    }

			// Caso 6: descuentos y recargos
			if ((key === 'discounts' || key === 'surchages') && Array.isArray(value)) {
			  const labelGroup = key === 'discounts' ? 'Descuentos' : 'Recargos'

			  value.forEach(item => {
			    const label = item.type === '%' ? 'Porcentaje' : 'Monto'

			    // Recorremos las diferencias (ej: __diff__surcharges_percent)
			    Object.keys(item).forEach(subKey => {
			      if (subKey.startsWith('__diff__')) {
			        const diff = item[subKey]

			        // 🔹 Transformar arrays con flag 'final' → agregar "F"
			        const oldVals = (diff.old || [])
			          .map(v => {
			            if (v && typeof v === 'object') {
			              const val = this.formatearNumero(v.value ?? v)
			              return v.final ? `${val}F` : val
			            }
			            return this.formatearNumero(v)
			          })
			          .join('-') || '—'

			        const newVals = (diff.new || [])
			          .map(v => {
			            if (v && typeof v === 'object') {
			              const val = this.formatearNumero(v.value ?? v)
			              return v.final ? `${val}F` : val
			            }
			            return this.formatearNumero(v)
			          })
			          .join('-') || '—'

			        // Mostrar el cambio visualmente
			        lines.push(
			          `<b>${labelGroup} (${label}):</b> ${oldVals} → <span class="text-success">${newVals}</span>`
			        )
			      }
			    })
			  })
			  return
			}

			
		  })

		  return lines.length
		    ? `<ul class="mb-0">${lines.map(l => `<li>${l}</li>`).join('')}</ul>`
		    : '—'
		},

		/**
		 * Formatea el diff de stock global mostrando "viejo → resultante (delta)".
		 * `d.new` es el stock RESULTANTE (no el delta) desde el prompt 04 (grupo 229).
		 * Si el diff es viejo (pre-prompt, sin `delta`) se muestra "viejo → nuevo"
		 * como antes, para no inventar un delta que no tenemos.
		 */
		formatStockDiff(d) {
		  if (!d) return ''

		  const oldVal = this.formatearNumero(d.old)
		  const newVal = this.formatearNumero(d.new)

		  if (typeof d.delta === 'undefined' || d.delta === null) {
		    return `${oldVal} → <span class="text-success">${newVal}</span>`
		  }

		  const signo = Number(d.delta) > 0 ? '+' : ''
		  const deltaVal = signo + this.formatearNumero(d.delta)

		  return `${oldVal} → <span class="text-success">${newVal}</span> (${deltaVal})`
		},

		/**
		 * Formatea un valor numérico para mostrar en el detalle del lote, quitando
		 * decimales innecesarios (ej: "1.00" -> "1").
		 */
		formatearNumero(valor) {
		  // 🔴 Por aca pasa CUALQUIER prop del articulo: un costo, un stock, un porcentaje y
		  // tambien texto (nombres, codigos de barras, categorias). Lo que no es un numero se
		  // devuelve tal cual: darle vuelta los puntos y las comas a una palabra la rompe.
		  if (valor === null || valor === '' || typeof valor == 'undefined' || typeof valor == 'boolean') {
		    return valor
		  }
		  const numero = Number(valor)
		  if (isNaN(numero)) return valor
		  // Number(-1.00).toString() ya devuelve "-1": alcanza para quitar
		  // los ceros/decimales sobrantes que trae el valor crudo del backend.
		  // Encima van los separadores de la interfaz: 1234.5 -> 1.234,5
		  return this.numero_es(numero.toString())
		},

		prettyPriceField(field) {
		  const map = {
		    percentage: '% Ganancia',
		    final_price: 'Precio final',
		    setear_precio_final: 'Setear precio final',
		  }
		  return map[field] || field.replaceAll('_', ' ')
		},

		/**
		 * Opcional: mejora visual de nombres de props (ej. cost -> Costo)
		 */
		prettyName(prop) {
			const map = {
				cost: 'Costo',
				stock_global: 'Stock Global',
				price_types_data: 'Listas de precios',
			}
			return map[prop] || prop.replaceAll('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
		},
	}
}
</script>