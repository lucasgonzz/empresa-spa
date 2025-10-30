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
		      lines.push(`<b>${this.prettyName(key)}:</b> ${diff.old} → <span class="text-success">${diff.new}</span>`)
		      return
		    }

		    // Caso 2: stock global
		    if (value && typeof value === 'object' && value.__diff__stock) {
		      const d = value.__diff__stock
		      lines.push(`<b>${this.prettyName(key)}:</b> ${d.old} → <span class="text-success">${d.new}</span>`)
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
			      subLines.push(`Stock: ${diffAmount.old} → <span class="text-success">${diffAmount.new}</span>`)
			    }
			    if (diffMin) {
			      subLines.push(`Mínimo: ${diffMin.old} → <span class="text-success">${diffMin.new}</span>`)
			    }
			    if (diffMax) {
			      subLines.push(`Máximo: ${diffMax.old} → <span class="text-success">${diffMax.new}</span>`)
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
		            return `&nbsp;&nbsp;${label}: ${diff.old ?? '—'} → <span class="text-success">${diff.new ?? '(S/A)'}</span>`
		          })

		        if (diffs.length) {
		          lines.push(`<ul class="mb-0">${diffs.map(d => `<li>${d}</li>`).join('')}</ul>`)
		        }
		      })
		      return
		    }

		    // Caso 5: valor plano (por compatibilidad)
		    if (typeof value !== 'object') {
		      lines.push(`<b>${this.prettyName(key)}:</b> ${value}`)
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
			              const val = v.value ?? v
			              return v.final ? `${val}F` : val
			            }
			            return v
			          })
			          .join('-') || '—'

			        const newVals = (diff.new || [])
			          .map(v => {
			            if (v && typeof v === 'object') {
			              const val = v.value ?? v
			              return v.final ? `${val}F` : val
			            }
			            return v
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