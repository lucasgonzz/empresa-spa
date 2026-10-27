<template>
	<div class="meli-card">
		<div class="meli-card__encabezado">
			<h6 class="meli-card__titulo">Lo que tenés que saber de Mercado Libre</h6>
			<b-link
			class="meli-saber__toggle"
			data-testid="meli-saber-toggle"
			@click="abierto = !abierto">
				{{ abierto ? 'Ocultar' : 'Ver' }}
			</b-link>
		</div>

		<b-collapse v-model="abierto">
			<ul class="meli-lista">
				<li>
					<strong>Publicar es gratis; vender, no.</strong> Mercado Libre te cobra entre el 11,62 % y el 17,75 % de cada venta, según el rubro y tu provincia. Si el producto sale menos de $33.000, se suma un costo fijo por unidad. Si ofrecés cuotas sin interés, pagás un extra.
				</li>
				<li>
					<strong>Desde $33.000, en productos nuevos, el envío gratis es obligatorio</strong> y una parte del costo la pagás vos. Cuanto mejor tu reputación, más barato te sale.
				</li>
				<li>
					<strong>El precio mínimo de una publicación es $1.000</strong> ($3.500 en productos de consumo masivo). El sistema no publica un artículo con un precio menor.
				</li>
				<li>
					<strong>Si recién empezás, vas a cobrar más tarde:</strong> sin reputación, la plata de cada venta se libera 14 días después de entregado el producto.
				</li>
				<li>
					<strong>La reputación (el termómetro de colores) es lo que más pesa.</strong> Se empieza a medir con 10 ventas y la bajan los reclamos, las ventas que cancelás vos y los despachos tarde. El sistema mantiene el stock sincronizado, pero si el stock del sistema está mal, vas a vender lo que no tenés.
				</li>
				<li>
					<strong>Las publicaciones necesitan datos completos:</strong> la categoría, lo que esa categoría pide (marca, modelo, código de barras si el producto lo tiene) y buenas fotos. Sin eso, Mercado Libre puede pausar la publicación o mostrarla menos.
				</li>
				<li>
					<strong>En muchos rubros Mercado Libre obliga a publicar "en catálogo":</strong> la foto y la descripción las pone Mercado Libre y vos competís por precio y entrega con otros vendedores del mismo producto.
				</li>
				<li>
					<strong>Mercado Libre puede cambiarte la categoría</strong> de una publicación si cree que va en otra, y eso puede cambiarte la comisión.
				</li>
				<li>
					<strong>Una vez que una publicación tiene ventas, no podés cambiarle el título.</strong> Y si se finaliza, no se puede reactivar: hay que publicarla de nuevo.
				</li>
				<li>
					<strong>La factura:</strong> si facturás tus ventas de Mercado Libre desde el sistema, no actives también el facturador de Mercado Libre, porque facturarías dos veces.
				</li>
				<li>
					<strong>No le mandes mensajes automáticos al comprador</strong> ("gracias por tu compra", "tu paquete salió"): Mercado Libre los bloquea y puede sancionar la cuenta.
				</li>
				<li>
					<strong>Si usás Full</strong>, el stock que está en los depósitos de Mercado Libre lo maneja Mercado Libre: el sistema no lo modifica.
				</li>
			</ul>
		</b-collapse>
	</div>
</template>
<script>
/**
 * Tarjeta "Lo que tenés que saber de Mercado Libre" de la solapa "Cuenta" (misión
 * mercado-libre-integracion, 27/10/2026).
 *
 * Es texto fijo, en lenguaje de comerciante, sacado de la sección "Lo que el comercio tiene que
 * saber antes de activar el módulo" de la investigación de la misión (montos de Mercado Libre
 * Argentina medidos el 27/10/2026: si Mercado Libre los cambia, se actualizan acá). Arranca
 * abierta cuando la cuenta todavía no está conectada, que es cuando más sirve leerla.
 * Los estilos viven en cuenta/Index.vue.
 */
export default {
	name: 'MeliCuentaQueTenesQueSaber',
	props: {
		abierto_por_defecto: {
			type: Boolean,
			default: false,
		},
	},
	data() {
		return {
			abierto: this.abierto_por_defecto,
		}
	},
	watch: {
		// Si la cuenta se conecta o desconecta con la tarjeta montada, acompaña el nuevo default
		abierto_por_defecto(valor) {
			this.abierto = valor
		},
	},
}
</script>
