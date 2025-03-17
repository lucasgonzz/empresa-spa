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
			<p
			v-else>
				{{ _client.company_name }}
			</p>
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
	}
}
</script>
<style lang="sass">
.client 
	border-radius: 5px
	@media screen and (max-width: 768px) 
		width: 300px
		height: 300px
		margin: 15px
	@media screen and (min-width: 768px) 
		width: 31%
		margin: 1%
	.content 
		height: 100%
		background: #FFF
		display: flex 
		justify-content: center 
		align-items: center 
		border-radius: 5px
		img 
			width: 100%
			border-radius: 5px
		p 
			font-size: 25px
			font-weight: bold 
			margin-bottom: 0

.client-online 
	border: 2px solid #218838
	position: relative
	cursor: pointer 
	&:hover 
		transform: scale(.95)
		transition: all .2s
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
