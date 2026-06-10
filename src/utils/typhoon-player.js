import Feature from 'ol/Feature.js'
import { LineString, Point } from 'ol/geom.js'
import VectorSource from 'ol/source/Vector.js'
import VectorLayer from 'ol/layer/Vector.js'
import { Style, Stroke, Circle, Fill } from 'ol/style.js'
import { fromLonLat } from 'ol/proj.js'

export class TyphoonPlayer {
  constructor(map) {
    this.map = map
    this.typhoons = {} // 当前加载的台风 { '202203': Typhoon实例 }
    this.vectorSource = new VectorSource()
    this.vectorLayer = new VectorLayer({
      source: this.vectorSource,
      // zIndex 设高一点，确保在底图上面
      zIndex: 10,
    })
    this.map.addLayer(this.vectorLayer)
  }

  async addTyphoon(tfbh) {
    // 1. 如果 this.typhoons[tfbh] 已存在，先 remove 再重建
    if (this.typhoons[tfbh]) {
      this.typhoons[tfbh].remove()
    }
    // 2. fetch /typhoon/track/:tfbh 拿数据
    const res = await fetch(`/typhoon/track/${tfbh}`)
    const json = await res.json()
    const points = json.data

    if (!points || points.length === 0) {
      console.warn('没有找到台风数据：' + tfbh)
      return
    }
    // 3. new Typhoon(this, data)
    // 4. 存到 this.typhoons[tfbh]
    this.typhoons[tfbh] = new Typhoon(this, points)
  }

  dropTyphoon(tfbh) {
    // 1. this.typhoons[tfbh].remove()
    // 2. delete this.typhoons[tfbh]
    if (this.typhoons[tfbh]) {
      this.typhoons[tfbh].remove()
      delete this.typhoons[tfbh]
    }
  }
}

class Typhoon {
  constructor(player, points) {
    this.player = player
    this.tfbh = points[0].tfbh
    this.name = points[0].name || ''
    this.points = points
    this.features = [] // 这个台风创建的所有 Feature
    this.playIndex = 0
    this.timer = null

    // 画静态路径线
    this.#drawTrack()
  }

  #drawTrack() {
    // 1. 构造坐标数组：把经纬度转成墨卡托投影坐标
    const coordinates = this.points.map((p) => {
      return fromLonLat([parseFloat(p.lon), parseFloat(p.lat)])
    })
    // 2. 创建 LineString 几何对象
    const lineGeometry = new LineString(coordinates)
    // 3. 创建 Feature，把几何对象包进去
    const lineFeature = new Feature({
      geometry: lineGeometry,
      tfbh: this.tfbh,
      type: 'track-line',
    })
    // 4. 设置样式
    lineFeature.setStyle(
      new Style({
        stroke: new Stroke({
          color: '#666666',
          width: 2,
        }),
      }),
    )
    // 5. 把 Feature 添加到矢量数据源，地图会自动渲染出来
    this.player.vectorSource.addFeature(lineFeature)
    this.features.push(lineFeature)
    // 6. 画轨迹点（小圆点）
    const pointStyle = new Style({
      image: new Circle({
        radius: 4,
        fill: new Fill({ color: '#3388ff' }),
        stroke: new Stroke({ color: '#ffffff', width: 1 }),
      }),
    })
    this.points.forEach((p) => {
      const coord = fromLonLat([parseFloat(p.lon), parseFloat(p.lat)])
      const pointFeature = new Feature({
        geometry: new Point(coord),
        type: 'track-point',
      })
      pointFeature.setStyle(pointStyle)
      this.player.vectorSource.addFeature(pointFeature)
      this.features.push(pointFeature)
    })
  }

  remove() {
    // 清除定时器、从 source 移除 feature
    // 停止动画
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }

    // 从数据源中移除这个台风的所有 Feature
    this.features.forEach((f) => {
      this.player.vectorSource.removeFeature(f)
    })
    this.features = []
  }
}
