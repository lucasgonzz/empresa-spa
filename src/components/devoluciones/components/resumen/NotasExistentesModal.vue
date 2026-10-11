<template>
	<b-modal
	id="devolucion-notas-existentes"
	data-testid="devolucion-notas-existentes"
	title="Esta venta ya tiene una nota de crédito"
	size="lg"
	hide-footer
	centered>

		<p>
			Ya hay una nota de crédito de esta venta que devolvió esas unidades. Antes de crear otra,
			elegí qué querés hacer.
		</p>

		<div
		v-for="nota in notas"
		:key="'nota-existente-'+nota.id"
		class="nota-existente border rounded p-3 m-b-10"
		:data-testid="'nota-existente-'+nota.id">

			<div class="nota-existente__cabecera">
				<strong>{{ nota.detalle }}</strong>
				<span class="nota-existente__importe">{{ price(nota.haber) }}</span>
				<span class="text-muted">{{ fecha(nota.created_at) }}</span>
			</div>

			<ul class="nota-existente__unidades">
				<li
				v-for="unidad in nota.unidades"
				:key="'nota-'+nota.id+'-art-'+unidad.article_id">
					{{ unidad.name }}: {{ unidad.unidades }} {{ unidad.unidades == 1 ? 'unidad' : 'unidades' }}
				</li>
			</ul>

			<div class="nota-existente__estado">
				<b-badge
				v-if="nota.facturada"
				variant="success">
					Facturada ante ARCA N° {{ nota.cbte_numero }}
				</b-badge>
				<b-badge
				v-else-if="nota.pendiente_en_arca"
				variant="warning">
					Enviada a ARCA (N° {{ nota.cbte_numero }}), pendiente de confirmación
				</b-badge>
				<b-badge
				v-else
				variant="secondary">
					Sin facturar ante ARCA
				</b-badge>
			</div>

			<div
			v-if="nota.puede_facturarse"
			class="nota-existente__facturar">

				<b-form-select
				v-if="nota.facturas.length > 1"
				size="sm"
				v-model="facturas_elegidas[nota.id]"
				:options="opciones_de_facturas(nota)"
				:data-testid="'nota-existente-factura-'+nota.id"></b-form-select>

				<p
				v-else
				class="m-b-0 text-muted">
					Se emite sobre la Factura N° {{ nota.facturas[0].cbte_numero }}
					({{ price(nota.facturas[0].importe_total) }}).
				</p>

				<b-button
				variant="success"
				size="sm"
				:data-testid="'nota-existente-facturar-'+nota.id"
				:disabled="facturando_id !== null"
				@click="facturar(nota)">
					{{ facturando_id == nota.id ? 'Facturando…' : 'Facturar esta nota con ARCA' }}
				</b-button>
			</div>

			<p
			v-else-if="!nota.facturada && !nota.pendiente_en_arca"
			class="nota-existente__sin-facturar text-muted m-b-0">
				Todavía no se puede facturar: la venta no tiene una factura autorizada por ARCA, o la
				factura ya no admite otra nota por ese importe.
			</p>
		</div>

		<p class="nota-existente__aviso text-muted">
			<strong>Crear otra de todos modos</strong> genera una segunda nota por esas unidades, y si
			tiene cuenta corriente le suma otro crédito al cliente. Si tenés tildado «Regresar stock», el
			sistema no va a dejar devolver otra vez esa mercadería: destildalo.
		</p>

		<div class="nota-existente__botones">
			<b-button
			variant="secondary"
			data-testid="nota-existente-cancelar"
			:disabled="facturando_id !== null"
			@click="cancelar">
				Cancelar
			</b-button>

			<b-button
			variant="outline-danger"
			data-testid="nota-existente-crear-igual"
			:disabled="facturando_id !== null"
			@click="crear_igual">
				Crear otra de todos modos
			</b-button>
		</div>
	</b-modal>
</template>
<script>
/**
 * Aviso de que la venta ya tiene una nota de crédito con las unidades que se quieren devolver de
 * nuevo (misión nc-aviso-existente-y-sin-cliente, 8/10/2026). Lo abre BtnGuardar cuando la API
 * responde 409 `nota_existente` y ofrece las tres salidas: facturar la nota que ya existe con ARCA,
 * crear otra de todos modos o cancelar.
 *
 * Facturar llama a `POST nota-credito/{id}/facturar` (el mismo endpoint del botón de Comprobantes).
 * Crear otra de todos modos no hace nada acá: avisa a BtnGuardar, que reenvía la devolución con
 * `confirmar_duplicada`.
 */
export default {
	props: {
		// Notas de crédito de la venta que chocan, tal como las manda la API (409).
		notas: {
			type: Array,
			default() {
				return []
			},
		},
	},
	data() {
		return {
			// Id de la nota que se está facturando (bloquea todos los botones mientras ARCA responde).
			facturando_id: null,
			// Factura elegida por nota cuando la venta tiene más de una: id de nota -> id de factura.
			facturas_elegidas: {},
		}
	},
	watch: {
		/**
		 * Al llegar notas nuevas se vuelve a empezar: con una sola factura posible queda elegida;
		 * con varias, el usuario tiene que decidir.
		 */
		notas() {
			let elegidas = {}

			this.notas.forEach(nota => {
				elegidas[nota.id] = nota.facturas && nota.facturas.length == 1 ? nota.facturas[0].id : null
			})

			this.facturas_elegidas = elegidas
		},
	},
	methods: {
		/**
		 * @param {Object} nota
		 * @returns {Array} Opciones del select de facturas de la nota.
		 */
		opciones_de_facturas(nota) {
			let opciones = [{ value: null, text: 'Elegí la factura...', disabled: true }]

			nota.facturas.forEach(factura => {
				opciones.push({
					value: factura.id,
					text: 'Factura N° ' + factura.cbte_numero + ' (' + this.price(factura.importe_total) + ')',
				})
			})

			return opciones
		},

		/**
		 * @param {String|null} valor Fecha `AAAA-MM-DD HH:MM:SS` de la API.
		 * @returns {String} Fecha corta dd/mm/aa, o vacío.
		 */
		fecha(valor) {
			if (!valor) {
				return ''
			}

			let partes = String(valor).substr(0, 10).split('-')

			return partes.length == 3 ? partes[2] + '/' + partes[1] + '/' + partes[0].substr(2) : ''
		},

		/**
		 * Emite la nota existente ante ARCA. Cualquier resultado cierra el aviso: si ARCA la
		 * autorizó, se avisa a BtnGuardar para que deje el módulo en blanco (la devolución nueva ya
		 * no hace falta); si no, queda la devolución como estaba y los errores en Comprobantes.
		 *
		 * @param {Object} nota Nota de crédito a facturar.
		 */
		facturar(nota) {
			let factura_id = this.facturas_elegidas[nota.id]

			if (!factura_id) {
				this.$toast.error('Elegí la factura sobre la que se emite la nota de crédito')
				return
			}

			if (this.facturando_id !== null) {
				return
			}

			let self = this
			this.facturando_id = nota.id
			this.$store.commit('auth/setMessage', 'Facturando la nota de crédito ante ARCA')
			this.$store.commit('auth/setLoading', true)

			// `skip_global_error_event`: el motivo lo muestra este componente, así sale un solo aviso.
			this.$api.post('nota-credito/' + nota.id + '/facturar', {
				afip_ticket_id: factura_id,
			}, { skip_global_error_event: true })
			.then(res => {
				self.terminar_de_facturar()

				// Si la pantalla de Comprobantes ya cargó esta nota, se la actualiza.
				if (res.data.model) {
					self.$store.commit('nota_credito/add', res.data.model)
				}

				if (res.data.facturada) {
					self.$toast.success(res.data.message)
					self.$bvModal.hide('devolucion-notas-existentes')
					self.$emit('facturada')
				} else {
					self.$toast.error(res.data.message, { duration: 10000 })
					self.$bvModal.hide('devolucion-notas-existentes')
				}
			})
			.catch(err => {
				self.terminar_de_facturar()

				let data = err && err.response ? err.response.data : null
				let mensaje = data && data.message ? data.message : 'No se pudo facturar la nota de crédito. Volvé a intentar.'
				self.$toast.error(mensaje, { duration: 10000 })
			})
		},

		/** Apaga el indicador de carga y libera los botones. */
		terminar_de_facturar() {
			this.facturando_id = null
			this.$store.commit('auth/setLoading', false)
			this.$store.commit('auth/setMessage', '')
		},

		/** Cancelar: se cierra y la devolución queda como estaba para que el usuario la corrija. */
		cancelar() {
			this.$bvModal.hide('devolucion-notas-existentes')
		},

		/** Crear otra de todos modos: se cierra y BtnGuardar reenvía confirmando la duplicada. */
		crear_igual() {
			this.$bvModal.hide('devolucion-notas-existentes')
			this.$emit('crear_igual')
		},
	},
}
</script>
<style lang="sass">
#devolucion-notas-existentes
	.nota-existente__cabecera
		display: flex
		flex-wrap: wrap
		align-items: baseline
		gap: 8px 14px
	.nota-existente__importe
		font-weight: 600
	.nota-existente__unidades
		margin: 8px 0
		padding-left: 18px
	.nota-existente__facturar
		display: flex
		flex-wrap: wrap
		align-items: center
		gap: 8px 12px
		margin-top: 10px
	.nota-existente__botones
		display: flex
		flex-wrap: wrap
		justify-content: flex-end
		gap: 8px
</style>
