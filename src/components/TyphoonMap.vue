<script setup lang="ts">
import { View } from 'ol'
import TileLayer from 'ol/layer/Tile'
import { XYZ } from 'ol/source'
import { onMounted, ref } from 'vue'
import Map from 'ol/Map'
import { fromLonLat } from 'ol/proj'
import { defaults as defaultControls } from 'ol/control'

const mapContainer = ref<HTMLElement>()
const map = ref<Map>()

const emit = defineEmits<{
  (e: 'map-loaded', map: Map): void
}>()

defineExpose({ map })

onMounted(() => {
  const gaodeLayer = new TileLayer({
    source: new XYZ({
      urls: [
        'https://webrd01.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&size=1&scale=1&style=8',
        'https://webrd02.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&size=1&scale=1&style=8',
        'https://webrd03.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&size=1&scale=1&style=8',
        'https://webrd04.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&size=1&scale=1&style=8',
      ],
    }),
  })
  map.value = new Map({
    target: mapContainer.value,
    view: new View({
      center: fromLonLat([108.9, 34.5]),
      zoom: 3.2,
      projection: 'EPSG:3857',
    }),
    layers: [gaodeLayer],
    controls: defaultControls({
      zoom: false,
      rotate: false,
    }),
  })

  map.value.on('loadend', () => {
    emit('map-loaded', map.value!)
  })
})
</script>

<template>
  <div ref="mapContainer" class="map"></div>
</template>

<style scoped>
.map {
  width: 100%;
  height: 100%;
}
</style>
