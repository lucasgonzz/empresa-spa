export function confirmar_traspaso(componente) {
	return componente.$bvModal.msgBoxConfirm(
		'Al enviar, esta conversación seguirá únicamente en el sistema, incluso si cerrás sesión. Tu historial queda acá.',
		{
			id: 'agentes-confirmar-traspaso',
			title: '¿Seguir esta conversación en el sistema?',
			okTitle: 'Continuar y enviar',
			cancelTitle: 'Cancelar',
			centered: true,
		}
	)
}
