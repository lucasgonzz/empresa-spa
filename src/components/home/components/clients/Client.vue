<template>
	<div 
	:class="has_online ? 'client-online' : ''"
	@click="toClient"
	class="client s-1">
		<div 
		v-if="has_online"
		class="e-commerce-title">
			Ver E-commerce
		</div>
		<div class="content">
			<img 
			v-if="_client.image_url"
			:src="_client.image_url">
			<p>
				{{ _client.ciudad }}, {{ _client.provincia }}
			</p>

			<div 
			@click.stop="toIg"
			v-if="_client.instragram"
			class="cont-ig">
				
				<img
				class="ig"
				src="https://comerciocity.com/img/instagram.da3e4fda.png?__WB_REVISION__=da3e4fda686612ac5ecd11bf341f64e7">
				</img>
				Ver perfil
			</div>
		</div>
	</div>
</template>
<script>
export default {
	props: {
		_client: Object,
	},
	computed: {
		has_online() {
			return this._client.online 
		}
	},
	methods: {
		toClient() {
			if (this._client.online) {
				window.open(this._client.online)
			}
		},
		toIg() {
			if (this._client.instragram) {
				window.open(this._client.instragram)
			}
		}
	}
}
</script>
<style lang="sass">
.client 
	border-radius: 10px
	@media screen and (max-width: 768px) 
		width: 300px
		margin: 15px
	@media screen and (min-width: 768px) 
		width: 31%
		margin: 1%

		
	&:hover 
		transform: scale(.95)
		transition: all .4s


		.cont-ig
			color: #405DE6 
			transform: scale(1.2)
			transition: all .4s


		
	.content 
		height: 100%
		background: #FFF
		display: flex 
		flex-direction: column
		justify-content: flex-start 
		align-items: center 
		border-radius: 10px
		img 
			width: 100%
			border-radius: 10px 10px 0 0 
			margin-bottom: 20px
		p 
			font-size: 20px
			margin-bottom: 20px


		.cont-ig
			display: flex 
			flex-direction: row 
			justify-content: center
			align-items: center
			margin-bottom: 20px
			cursor: pointer
			font-size: 14px


			&:hover 
				text-decoration: underline

			.ig
				width: 35px 
				cursor: pointer
				margin: 0 10px 0 0


.client-online 
	border: 2px solid #218838
	position: relative
	cursor: pointer 
	.e-commerce-title
		position: absolute
		width: 100%
		top: 0 
		left: 0 
		background: #218838
		color: #FFF 
		padding: 5px
		// font-weight: bold
		font-size: 15px
		text-align: center
</style>
