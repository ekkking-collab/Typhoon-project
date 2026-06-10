<script setup>
import TyphoonMap from '@/components/TyphoonMap.vue'
import TyphoonList from '@/components/TyphoonList.vue'
import { ref } from 'vue'
import { TyphoonPlayer } from '@/utils/typhoon-player.js'

const olMap = ref(null)
let player = null

function onMapLoaded(map) {
  olMap.value = map
  player = new TyphoonPlayer(map)
  console.log('地图加载完成，map 实例已就绪')
}
function onCheckTyphoon(tfbh, isChecked) {
  // tfbh → emit 的第二个参数
  // isChecked → emit 的第三个参数
  console.log('台风编号:', tfbh, '是否选中:', isChecked)
  if (isChecked) {
    player.addTyphoon(tfbh)
  } else {
    player.dropTyphoon(tfbh)
  }
}
</script>

<template>
  <TyphoonMap @map-loaded="onMapLoaded" />
  <TyphoonList @check-typhoon="onCheckTyphoon" />
</template>

<style scoped></style>
