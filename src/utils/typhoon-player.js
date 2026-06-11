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
    const typhoon = new Typhoon(this, points)
    this.typhoons[tfbh] = typhoon

    // 视图飞到台风起点（仅视觉效果，不依赖回调）
    const firstPoint = points[0]
    const center = fromLonLat([parseFloat(firstPoint.lon), parseFloat(firstPoint.lat)])
    this.map.getView().animate({ zoom: 4, center: center, duration: 1000 })

    // 用独立延迟启动轨迹动画，不等视图动画
    setTimeout(() => {
      if (this.typhoons[tfbh]) {
        typhoon.play()
      }
    }, 500)
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
    this.stopped = false  // 停止标记，防止 remove 后继续播放

    // 画静态路径线
    this.#drawTrack()
    // 动画
    // this.play()
  }

  #drawTrack() {
    // 预转换所有坐标
    this.coords = this.points.map((p) => {
      return fromLonLat([parseFloat(p.lon), parseFloat(p.lat)])
    })

    // 路径线 —— 初始为空，播放时逐步增长
    this.lineFeature = new Feature({
      geometry: new LineString([]),
    })
    this.lineFeature.setStyle(
      new Style({
        stroke: new Stroke({ color: '#666666', width: 2 }),
      }),
    )
    this.player.vectorSource.addFeature(this.lineFeature)
    this.features.push(this.lineFeature)

    // 红色大圆点，表示台风此刻的位置
    this.currentPointFeature = new Feature({
      geometry: new Point(this.coords[0]),
    })
    this.currentPointFeature.setStyle(
      new Style({
        image: new Circle({
          radius: 6,
          fill: new Fill({ color: '#ff4444' }),
          stroke: new Stroke({ color: '#ffffff', width: 1 }),
        }),
      }),
    )
    this.player.vectorSource.addFeature(this.currentPointFeature)
    this.features.push(this.currentPointFeature)

    // 已走过的轨迹点（小灰点）
    this.pointFeatures = this.points.map((p, i) => {
      const feat = new Feature({
        geometry: new Point(this.coords[i]),
      })
      feat.setStyle(
        new Style({
          image: new Circle({
            radius: 3,
            fill: new Fill({ color: '#3388ff' }),
            stroke: new Stroke({ color: '#ffffff', width: 1 }),
          }),
        }),
      )
      feat.set('visible', false) // 初始全隐藏
      this.player.vectorSource.addFeature(feat)
      this.features.push(feat)
      return feat
    })
  }

  remove() {
    // 先打标记，防止 play 再创建新定时器
    this.stopped = true

    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }

    // 直接从 source 查出当前所有 Feature，找到属于本台风的
    const allFeatures = this.player.vectorSource.getFeatures()
    allFeatures.forEach((f) => {
      if (this.features.includes(f)) {
        this.player.vectorSource.removeFeature(f)
      }
    })
    this.features = []

    // 逐级强制刷新
    this.player.vectorSource.changed()
    this.player.vectorLayer.changed()
  }

  play() {
    // 已被 stop/remove，不再继续
    if (this.stopped) {
      return
    }

    // 已播完，停下
    if (this.playIndex >= this.coords.length) {
      this.stop()
      return
    }

    // 更新路径线：取前 playIndex+1 个点
    const visibleCoords = this.coords.slice(0, this.playIndex + 1)
    this.lineFeature.setGeometry(new LineString(visibleCoords))

    // 更新当前位置点
    this.currentPointFeature.setGeometry(new Point(this.coords[this.playIndex]))

    // 显示之前走过的点
    for (let i = 0; i <= this.playIndex; i++) {
      this.pointFeatures[i].set('visible', true)
    }

    // 推进一帧，200ms 后播放下一帧
    this.playIndex++
    this.timer = setTimeout(() => {
      this.play()
    }, 200)
  }

  stop() {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }
}
