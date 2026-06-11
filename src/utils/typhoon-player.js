import Feature from 'ol/Feature.js'
import { LineString, Point, Polygon } from 'ol/geom.js'
import VectorSource from 'ol/source/Vector.js'
import VectorLayer from 'ol/layer/Vector.js'
import { Style, Stroke, Circle, Fill } from 'ol/style.js'
import { fromLonLat } from 'ol/proj.js'
import Overlay from 'ol/Overlay.js'
import proj4 from 'proj4'

export class TyphoonPlayer {
  constructor(map) {
    this.map = map
    this.typhoons = {}

    this.vectorSource = new VectorSource()
    this.vectorLayer = new VectorLayer({
      source: this.vectorSource,
      zIndex: 10,
    })
    this.map.addLayer(this.vectorLayer)

    // 弹窗：Overlay + DOM
    this.popupEl = document.createElement('div')
    this.popupEl.className = 'ol-popup'
    this.popupEl.style.cssText = `
      position: absolute;
      background: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      pointer-events: none;
      white-space: nowrap;
    `
    // 【关键】必须手动挂到 DOM 上，Overlay 不会帮你做这件事
    document.body.appendChild(this.popupEl)

    this.popup = new Overlay({
      element: this.popupEl,
      offset: [0, -10],
      positioning: 'bottom-center',
    })
    this.map.addOverlay(this.popup)

    // 鼠标悬停检测
    this.map.on('pointermove', (e) => {
      const typhoonFeatures = this.map.getFeaturesAtPixel(e.pixel, {
        hitTolerance: 10,
        layerFilter: (layer) => layer === this.vectorLayer,
      })

      if (typhoonFeatures.length > 0) {
        const feature = typhoonFeatures[0]
        const data = feature.get('data')
        const coord = feature.getGeometry().getCoordinates()
        console.log('命中 feature, data:', data, 'coord:', coord)

        if (data) {
          this.map.getTargetElement().style.cursor = 'pointer'

          const time = data.pass_time ? new Date(data.pass_time).toLocaleString('zh-CN') : '/'

          this.popupEl.innerHTML = `
            <div><strong>${data.tfbh || ''}</strong></div>
            <div>时间：${time}</div>
            <div>风速：${data.wind_speed || '/'} m/s</div>
            <div>气压：${data.pressure || '/'} hPa</div>
            <div>移向：${data.move_dir || '/'}　移速：${data.move_speed || '/'} m/s</div>
            <div>七级风圈：${data.circle7 || '/'} km</div>
          `
          this.popup.setPosition(coord)
        }
      } else {
        this.map.getTargetElement().style.cursor = ''
        this.popup.setPosition(undefined)
      }
    })
  }

  async addTyphoon(tfbh) {
    if (this.typhoons[tfbh]) {
      this.typhoons[tfbh].remove()
    }

    const res = await fetch(`/typhoon/track/${tfbh}`)
    const json = await res.json()
    const points = json.data

    if (!points || points.length === 0) {
      console.warn('没有找到台风数据：' + tfbh)
      return
    }

    const typhoon = new Typhoon(this, points)
    this.typhoons[tfbh] = typhoon

    // 视图飞到台风起点
    const firstPoint = points[0]
    const center = fromLonLat([parseFloat(firstPoint.lon), parseFloat(firstPoint.lat)])
    this.map.getView().animate({ zoom: 4, center: center, duration: 1000 })

    // 延迟启动轨迹动画
    setTimeout(() => {
      if (this.typhoons[tfbh]) {
        typhoon.play()
      }
    }, 500)
  }

  dropTyphoon(tfbh) {
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
    this.features = []
    this.circleFeatures = []  // 所有风圈 Feature（按点分组）
    this.playIndex = 0
    this.timer = null
    this.stopped = false

    this.#drawTrack()
  }

  #drawTrack() {
    // 预转换所有坐标
    this.coords = this.points.map((p) => {
      return fromLonLat([parseFloat(p.lon), parseFloat(p.lat)])
    })

    // 路径线 —— 初始为空，播放时逐步增长
    this.lineFeature = new Feature({
      geometry: new LineString([]),
      tfbh: this.tfbh,
    })
    this.lineFeature.setStyle(
      new Style({
        stroke: new Stroke({ color: '#666666', width: 2 }),
      }),
    )
    this.player.vectorSource.addFeature(this.lineFeature)
    this.features.push(this.lineFeature)

    // 红色大圆点：台风当前位置
    this.currentPointFeature = new Feature({
      geometry: new Point(this.coords[0]),
      tfbh: this.tfbh,
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

    // 轨迹点 + 风圈
    const windLevels = [
      { circle: 'circle7', color: 'rgba(0, 186, 178, 0.25)', strokeColor: '#00bab2' },
      { circle: 'circle10', color: 'rgba(255, 255, 0, 0.25)', strokeColor: '#ffff00' },
      { circle: 'circle12', color: 'rgba(218, 115, 65, 0.25)', strokeColor: '#da7341' },
    ]

    this.pointFeatures = this.points.map((p, i) => {
      const feat = new Feature({
        geometry: new Point(this.coords[i]),
        tfbh: this.tfbh,
      })
      feat.set('data', p)
      feat.setStyle(
        new Style({
          image: new Circle({
            radius: 3,
            fill: new Fill({ color: '#3388ff' }),
            stroke: new Stroke({ color: '#ffffff', width: 1 }),
          }),
        }),
      )
      feat.set('visible', false)
      this.player.vectorSource.addFeature(feat)
      this.features.push(feat)

      // 为每个点创建风圈 Feature
      windLevels.forEach((level) => {
        const ring = this.#createWindCircle(
          parseFloat(p.lon), parseFloat(p.lat),
          p[level.circle]
        )
        if (ring) {
          const circleFeat = new Feature({
            geometry: new Polygon([ring]),
          })
          circleFeat.setStyle(
            new Style({
              fill: new Fill({ color: level.color }),
              stroke: new Stroke({ color: level.strokeColor, width: 1 }),
            }),
          )
          circleFeat.set('visible', false)
          circleFeat.set('pointIndex', i)  // 标记属于第几个点
          this.circleFeatures.push(circleFeat)
          this.player.vectorSource.addFeature(circleFeat)
          this.features.push(circleFeat)
        }
      })

      return feat
    })
  }

  /**
   * 计算风圈多边形环
   * @param {number} centerLon 中心经度
   * @param {number} centerLat 中心纬度
   * @param {string|null} circleStr "ne,nw,sw,se" 格式的四方向半径(km)
   * @returns {Array|null} 坐标环数组 或 null
   */
  #createWindCircle(centerLon, centerLat, circleStr) {
    if (!circleStr) return null

    const parts = circleStr.split(',').map(Number)
    if (parts.length < 4) return null

    const [ne, nw, sw, se] = parts
    if (!ne || ne <= 0) return null

    // 中心点转到墨卡托（米制）
    const center3857 = proj4('EPSG:4326', 'EPSG:3857', [centerLon, centerLat])

    const quadrantRadii = [ne, nw, sw, se]
    const degreeInterval = 6
    const pointsPerQuadrant = Math.floor(360 / (degreeInterval * 4))  // = 15

    const ring = []
    for (let q = 0; q < 4; q++) {
      // 象限顺序：NE(0°) → NW(90°) → SW(180°) → SE(270°)
      const r = (quadrantRadii[q] || 0) * 1000  // km → 米
      const startJ = q * pointsPerQuadrant
      const endJ = (q + 1) * pointsPerQuadrant
      for (let j = startJ; j <= endJ; j++) {
        const angle = (degreeInterval * j * Math.PI) / 180
        const x = center3857[0] + r * Math.cos(angle)
        const y = center3857[1] + r * Math.sin(angle)
        const coord4326 = proj4('EPSG:3857', 'EPSG:4326', [x, y])
        ring.push(coord4326)
      }
    }

    return ring
  }

  remove() {
    this.stopped = true

    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }

    const allFeatures = this.player.vectorSource.getFeatures()
    allFeatures.forEach((f) => {
      if (this.features.includes(f)) {
        this.player.vectorSource.removeFeature(f)
      }
    })
    this.features = []
    this.circleFeatures = []

    this.player.vectorSource.changed()
    this.player.vectorLayer.changed()
  }

  play() {
    if (this.stopped) return

    if (this.playIndex >= this.coords.length) {
      this.stop()
      return
    }

    // 更新路径线
    const visibleCoords = this.coords.slice(0, this.playIndex + 1)
    this.lineFeature.setGeometry(new LineString(visibleCoords))

    // 更新当前位置点
    this.currentPointFeature.setGeometry(new Point(this.coords[this.playIndex]))

    // 显示已走过的轨迹点
    for (let i = 0; i <= this.playIndex; i++) {
      this.pointFeatures[i].set('visible', true)
    }

    // 更新风圈：只显示当前帧的风圈，隐藏其他的
    this.circleFeatures.forEach((f) => {
      f.set('visible', f.get('pointIndex') === this.playIndex)
    })

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
