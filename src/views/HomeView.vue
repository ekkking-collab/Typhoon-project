<script setup lang="ts">
import TyphoonMap from '@/components/TyphoonMap.vue'
import type Map from 'ol/Map'
import { ref } from 'vue'
const olMap = ref<Map | null>(null)

function onMapLoaded(map: Map) {
  olMap.value = map
  console.log('地图加载完成，map 实例已就绪')
}
</script>

<template>
  <TyphoonMap @map-loaded="onMapLoaded" />
</template>

<style scoped></style>
