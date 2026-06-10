<script setup>
import TyphoonMap from '@/components/TyphoonMap.vue'
import { ref } from 'vue'

const olMap = ref(null)

function onMapLoaded(map) {
  olMap.value = map
  console.log('地图加载完成，map 实例已就绪')
}
</script>

<template>
  <TyphoonMap @map-loaded="onMapLoaded" />
</template>

<style scoped></style>
