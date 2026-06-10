<script setup>
import { onMounted, ref } from 'vue'
import axios from 'axios'
import { watch } from 'vue'

// 台风列表接收
const typhoonList = ref([])
// 台风年份选择
const selectyear = ref([
  { value: '2020', label: '2020' },
  { value: '2021', label: '2021' },
  { value: '2022', label: '2022' },
])
// 选择了哪个年份
const currentYear = ref('')

// 下拉框年份变化监听
watch(currentYear, (newYear) => {
  getTyphoonList(newYear)
})

const emit = defineEmits(['check-typhoon'])
// 记录上一次选中的台风编号
const lastSelected = ref(null)

function selectChange(selection, row) {
  const isChecked = selection.some((item) => item.tfbh === row.tfbh)

  lastSelected.value = isChecked ? row.tfbh : null
  emit('check-typhoon', row.tfbh, isChecked)
}

onMounted(() => {})

// 从接口获取台风数据
async function getTyphoonList(year) {
  const res = await axios.get('/typhoon/list', { params: { year } })
  typhoonList.value = res.data.data
  console.log(typhoonList.value)
}
</script>

<template>
  <div class="typhoon-list">
    <div class="title">
      <!-- 年份筛选框 -->
      <div class="year-select">
        <div class="head">台风列表</div>
        <el-select v-model="currentYear" placeholder="选择年份">
          <el-option
            v-for="item in selectyear"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          ></el-option>
        </el-select>
      </div>
      <!-- 台风列表 -->
      <el-table
        class="list"
        :data="typhoonList"
        height="200"
        style="width: 100%"
        v-if="currentYear"
        @select="selectChange"
      >
        <el-table-column type="selection" width="55"></el-table-column>
        <el-table-column prop="tfbh" label="台风编号"></el-table-column>
        <el-table-column prop="name" label="中文名称"></el-table-column>
        <el-table-column prop="name_en" label="英文名称"></el-table-column>
      </el-table>
    </div>
  </div>
</template>

<style scoped>
.year-select {
  display: flex;
}
.head {
  width: 100px;
  font-size: 16px;
  padding: 4px 12px;
}
.list {
  margin-top: 10px !important;
}
.typhoon-list {
  position: absolute;
  top: 10px;
  right: 20px;
  width: 300px;
  background: rgba(255, 255, 255, 0.9);
  padding: 12px;
  border-radius: 8px;
  max-height: 300px;
  overflow-y: auto;
  z-index: 10;
}
li {
  list-style: none;
  padding: 4px 0;
  cursor: pointer;
}
.el-select-dropdown__item {
  padding: 8px;
  line-height: 16px;
}
</style>
