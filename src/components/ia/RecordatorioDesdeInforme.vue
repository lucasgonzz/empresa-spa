<template>
	<!--
		El modal de alertas > Cobros (RecordatorioCobro.vue) tal cual, montado UNA vez por
		informe desde Informe.vue y nunca uno por bloque de acciones: con dos instancias del
		mismo id="recordatorio-cobro", $bvModal.show abriría las dos a la vez y sus dos
		previsualizaciones se pisarían en el mismo store.
	-->
	<recordatorio-cobro
	:cliente="cliente"></recordatorio-cobro>
</template>

<script>
/*
	Import directo y no `() => import()`: el botón que abre el modal vive en un bloque que sí
	baja aparte (bloques/Acciones.vue), así que para cuando el dueño lo puede tocar este modal
	ya está creado y escuchando el show. Con el modal también en diferido, un clic antes de que
	bajara su chunk no abría nada y no avisaba nada.
*/
import RecordatorioCobro from '@/components/alertas/modals/cobros/RecordatorioCobro'

/**
 * Anfitrión del recordatorio de cobro por WhatsApp dentro del informe abierto (misión
 * "mostrador-caja-vencimientos", 15/9/2026). Las acciones `cobrar` del informe de caja
 * traen el `client_id` del cliente (el backend lo valida al depositar: tiene que ser un
 * cliente del dueño) y el botón de bloques/Acciones.vue termina llamando a abrir().
 *
 * No duplica nada del recordatorio: el modal previsualiza con el backend (canal, y el
 * motivo si no se puede), el dueño confirma y sale con su propio store
 * (sale/recordatorio_cobro).
 *
 * Lo que vive en otro lado:
 * - Que el modal se vea ENCIMA del informe (overlay en 1062) y que Escape cierre solo el
 *   modal: InformeAbierto.vue (z-index del contenedor del modal y corte por `modal-open`).
 * - ⚠️ Límite conocido, documentado y sin arreglar (plan §2.2): el modal toma los `dias`
 *   de `sale.ventas_sin_cobrar.dias`. Si en la misma sesión el dueño filtró Alertas >
 *   Cobros por días, la previsualización respeta ese filtro y puede decir que el cliente no
 *   tiene ventas con el filtro actual.
 */
export default {
	components: {
		RecordatorioCobro,
	},
	data() {
		return {
			// { id } del cliente de la acción tocada: RecordatorioCobro usa solo cliente.id.
			// null hasta el primer clic.
			cliente: null,
		}
	},
	methods: {
		/**
		 * Molde de alertas > Cobros (abrir_recordatorio): primero el prop y recién en el
		 * $nextTick el show. El modal pide la previsualización en su @show leyendo
		 * this.cliente; con el show en el mismo tick, al abrirlo para un cliente distinto
		 * pedía la del anterior (medido en Cobros.vue el 30 y el 31/8/2026).
		 *
		 * @param {number} client_id
		 */
		abrir(client_id) {
			let self = this
			this.cliente = { id: client_id }
			this.$nextTick(function () {
				self.$bvModal.show('recordatorio-cobro')
			})
		},
	},
}
</script>
