<template>
	<div>
		<import
		:props_to_send="props_to_send"
		model_name="provider_order"
		model_name_spanish="articulos"
		:advises="advises"
		:pedir_operacion_a_realizar="false"
		:columns="columns"
		@import-success="handleImportSuccess">
			<b-form-group label="Tipo de importación">
				<b-form-radio-group
				v-model="import_type"
				:options="import_type_options"
				buttons
				button-variant="outline-primary"
				size="sm">
				</b-form-radio-group>
			</b-form-group>
			<b-form-group label="Modo de importación">
				<b-form-radio-group
				v-model="overwrite_articles"
				:options="overwrite_articles_options"
				buttons
				button-variant="outline-primary"
				size="sm">
				</b-form-radio-group>
				<b-form-text class="text-muted">
					{{ overwrite_articles_description }}
				</b-form-text>
			</b-form-group>
		</import>
		<import-diff></import-diff>
	</div>
</template>
<script>
export default {
	components: {
		Import: () => import('@/common-vue/components/import/Index'),
		ImportDiff: () => import('@/components/provider/modals/orders/ImportDiff'),
	},
	data() {
		return {
			import_type: 'pedido',
			import_type_options: [
				{ text: 'Importar pedido', value: 'pedido' },
				{ text: 'Importar recibidos', value: 'recibido' },
			],
			overwrite_articles: false,
			/*
			 * Evita pedir el diff más de una vez por importación si el watcher de import_status
			 * se dispara varias veces con status 'completado' (ej. un broadcast duplicado).
			 * Se resetea apenas arranca una importación nueva de ESTA compra.
			 */
			diff_ya_solicitado: false,
			/*
			 * 🔴 Id de la compra que disparó el ÚLTIMO import confirmado desde este componente,
			 * capturado en handleImportSuccess() — NO se lee de `this.model.id` en el watcher.
			 * Este componente es único y persistente (montado una sola vez arriba del listado,
			 * no por fila): `this.model` es "la compra que la pantalla tiene seleccionada ahora",
			 * que cambia apenas el usuario mira otra fila — cosa perfectamente normal mientras un
			 * import sigue procesándose de fondo en el worker. Comparar el watcher contra
			 * `this.model.id` (como se hizo en un primer intento) pierde el aviso automático
			 * apenas el usuario navega a otra compra durante esa espera. Este valor no se mueve
			 * con la navegación, así que sigue apuntando a la compra correcta.
			 */
			provider_order_id_del_import_en_curso: null,
		}
	},
	computed: {
		/*
		 * Desde la misión `import-excel-compras-chunks` (14/9/2026) la importación corre
		 * asíncrona: este store (compartido con el import de artículos) es la única forma de
		 * saber cuándo terminó. provider_order_id lo filtra para no reaccionar a la
		 * importación de otra cosa.
		 */
		import_status() {
			return this.$store.state.import_status.model
		},
		advises() {
			return [
				'Las celdas que esten en blanco en el excel, no actualizaran informacion ya existente de los articulos de la compra.',
				'Para que una celda actualice la informacion, no debe estar vacia.',
				'Si en el excel que va a importar faltan articulos que ya estan cargados en la compra, estos articulos faltantes en el excel no se eliminaran de la compra, es decir, el excel agrega/actualiza informacion de los articulos, pero no sobreescribe/reemplaza lo que ya hay.',
			]
		},
		model() {
			return this.$store.state.provider_order.model
		},
		props_to_send() {
			return {
				provider_order_id: this.model.id,
				import_type: this.import_type,
				overwrite_articles: this.overwrite_articles,
			}
		},
		overwrite_articles_options() {
			return [
				{ text: 'Actualizar lista de artículos', value: false },
				{ text: 'Sobreescribir artículos', value: true },
			]
		},
		overwrite_articles_description() {
			if (this.overwrite_articles) {
				return 'Sobreescribir artículos: reemplaza la lista actual por la del Excel (elimina de la compra los artículos que no estén en el archivo).'
			}
			return 'Actualizar lista de artículos: agrega/actualiza lo que venga en el Excel y conserva en la compra los artículos que no estén en el archivo.'
		},
		columns() {
			if (this.import_type === 'recibido') {
				return [
					{ text: 'Codigo de barras' },
					{ text: 'Codigo de proveedor' },
					{ text: 'Nombre' },
					{ text: 'Cantidad recibida' },
					{ text: 'Costo' },
					{ text: 'Notas' },
				].map((col, i) => ({ ...col, column: i + 1 }))
			}
			return [
				{ text: 'Codigo de barras' },
				{ text: 'Codigo de proveedor' },
				{ text: 'Nombre' },
				{ text: 'Cantidad' },
				{ text: 'Costo' },
				{ text: 'Notas' },
			].map((col, i) => ({ ...col, column: i + 1 }))
		},
	},
	watch: {
		/*
		 * El diff pedido/recibido ya no viaja en la respuesta HTTP del upload (la importación
		 * corre en la cola): se pide recién cuando este store, compartido con el import de
		 * artículos, marca a ESTA compra como 'completado'.
		 *
		 * 🔴 Ojo, esto se sacó a propósito: NO se condiciona por `this.import_type`. Ese dato es
		 * el valor ACTUAL del radio del formulario, no el tipo con el que se disparó el import
		 * que efectivamente terminó — este componente es único y persistente (montado una sola
		 * vez arriba del listado, no por fila), así que el usuario puede reabrir el modal para
		 * OTRA compra o cambiar el radio a "pedido" mientras el import 'recibido' anterior sigue
		 * procesándose en el worker. Si se comparara contra `this.import_type` acá, el diff se
		 * habría calculado y guardado bien en el backend pero jamás se hubiera mostrado. El
		 * propio endpoint decide si hay algo que mostrar (devuelve `diff: []` si el import que
		 * terminó no era 'recibido'), así que alcanza con pedirlo siempre que ESTA compra
		 * termine.
		 *
		 * 🔴 NO lleva `immediate: true`, y hasta el 17/9/2026 lo llevaba con un comentario que
		 * decía cubrir "navegar fuera de esta compra mientras el import corre y volver después".
		 * No lo cubría: `provider_order_id_del_import_en_curso` vive en data(), así que al
		 * remontar el componente vuelve a null y el handler inmediato sale por el guard de abajo
		 * sin hacer nada. Un comentario que promete algo que el código no hace es peor que no
		 * tenerlo, porque el próximo que lea confía. Si algún día hay que cubrir ese escenario de
		 * verdad, el id tiene que sobrevivir al remontado (store o sessionStorage), no alcanza
		 * con disparar el watcher antes.
		 */
		import_status: {
			handler(nuevo) {
				/*
				 * El null del id NO se compara con !==: un import de ARTÍCULOS trae
				 * provider_order_id null, y si todavía no se disparó ninguna importación de
				 * compra desde este componente, la propiedad también es null — `null !== null`
				 * da false y el guard dejaba pasar, disparando un getModels() y un GET a
				 * `provider-order/null/import-diff` cada vez que alguien terminaba de importar
				 * su catálogo estando parado en Compras.
				 */
				if (!nuevo || !this.provider_order_id_del_import_en_curso) {
					return
				}

				if (nuevo.provider_order_id !== this.provider_order_id_del_import_en_curso) {
					return
				}

				if (nuevo.status === 'pendiente' || nuevo.status === 'en_proceso') {
					this.diff_ya_solicitado = false
					return
				}

				if (nuevo.status === 'completado' && !this.diff_ya_solicitado) {
					this.diff_ya_solicitado = true
					this.$store.dispatch('provider_order/getModels')
					this.cargar_diff_de_importacion(nuevo.provider_order_id)
				}
			},
		},
	},
	methods: {
		/*
		 * `this.model.id` todavía es la compra correcta acá: sendRequest() recién resolvió, el
		 * modal ni empezó a cerrarse, así que el usuario no tuvo chance de navegar a otra fila
		 * todavía. Es el único momento seguro para capturar este valor — ver el comentario de
		 * `provider_order_id_del_import_en_curso` en data().
		 */
		handleImportSuccess() {
			this.provider_order_id_del_import_en_curso = this.model.id
			this.$store.dispatch('provider_order/getModels')
		},
		cargar_diff_de_importacion(provider_order_id) {
			let self = this
			this.$api.get('provider-order/' + provider_order_id + '/import-diff')
			.then(res => {
				if (res.data && res.data.diff && res.data.diff.length) {
					self.$store.commit('provider_order/setImportDiff', res.data.diff)
					self.$bvModal.show('import-diff-provider-order')
				}
			})
			.catch(() => {
				/*
				 * El diff ya está calculado y guardado del lado del servidor: lo único que se
				 * perdió acá es mostrarlo. Se devuelve la bandera para que un próximo aviso de
				 * 'completado' de ESTA compra lo vuelva a pedir — sin esto, el pedido fallido
				 * dejaba `diff_ya_solicitado` en true y el usuario se quedaba sin el diff Y sin
				 * enterarse, porque nadie reintenta.
				 */
				self.diff_ya_solicitado = false
				self.$toast.error('No pudimos mostrar la comparación de pedido y recibido. Volvé a abrir la compra para verla.')
			})
		},
	},
}
</script>
